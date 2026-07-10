import { OtterPocketBase } from '../../../otterbots/utils/pocketbase/pocketbase';
import { otterlogs } from '../../../otterbots/utils/otterlogs';
import { findDiscordUserRecordId } from '../screenshotHelper';

/**
 * Collection : pokedeviner_stats
 */
export interface MateloutreDleRecord {
    id: string;
    discord_user: string;
    start_at: string;
    success_at: string;
    nb_try: number;
    pokemon_name: string;
    pokemon_try_list: string | string[]; // Allow string or array
    is_expired: boolean;
    created: string;
    updated: string;
}

export class PokedleStatsService {

    /**
     * Synchronise une partie de Pokedle avec PocketBase.
     * Si `pbRecordId` n'est pas fourni, crée une nouvelle ligne.
     * Sinon, met à jour la ligne existante.
     * 
     * @returns L'ID PocketBase de la partie.
     */
    static async syncGame(
        discordUserId: string,
        targetPokemonName: string,
        tryList: string[],
        isWin: boolean,
        pbRecordId?: string,
        isExpired: boolean = false
    ): Promise<string | undefined> {
        try {
            const pbUserId = await findDiscordUserRecordId(discordUserId);
            if (!pbUserId) {
                otterlogs.warn(`PokedleStatsService: Utilisateur Discord ${discordUserId} introuvable — synchronisation annulée.`);
                return pbRecordId;
            }

            const pb = await OtterPocketBase.getClient();
            const now = new Date();
            
            const payload: Partial<MateloutreDleRecord> = {
                discord_user: pbUserId,
                pokemon_name: targetPokemonName,
                pokemon_try_list: JSON.stringify(tryList),
                nb_try: tryList.length,
                is_expired: isExpired,
            };

            if (isWin) {
                payload.success_at = now.toISOString();
            } else if (!pbRecordId) {
                payload.success_at = ""; 
            }

            if (pbRecordId) {
                try {
                    await pb.collection('pokedeviner_stats').update(pbRecordId, payload, { requestKey: null });
                    return pbRecordId;
                } catch (updateError: unknown) {
                    if (updateError && typeof updateError === 'object' && 'status' in updateError && updateError.status === 404) {
                        otterlogs.warn(`PokedleStatsService: Partie ${pbRecordId} introuvable (404). Recréation d'une nouvelle ligne.`);
                        pbRecordId = undefined; // Force la création
                    } else {
                        throw updateError;
                    }
                }
            }

            if (!pbRecordId) {
                payload.start_at = now.toISOString();
                const record = await pb.collection('pokedeviner_stats').create(payload, { requestKey: null });
                otterlogs.debug(`PokedleStatsService: Nouvelle partie créée pour ${discordUserId} (ID: ${record.id}).`);
                return record.id;
            }
            return pbRecordId;
        } catch (error: unknown) {
            otterlogs.error(`PokedleStatsService: Erreur lors de la synchro de la partie : ${error}`);
            if (error && typeof error === 'object' && 'data' in error) {
                otterlogs.error(`PokedleStatsService: Détails validation PB : ${JSON.stringify((error as { data: unknown }).data)}`);
            }
            return pbRecordId;
        }
    }

    /**
     * Marque toutes les parties en cours de plus de `hours` heures comme expirées.
     */
    static async expireOldGames(hours: number): Promise<void> {
        try {
            const pb = await OtterPocketBase.getClient();
            const dateLimit = new Date();
            dateLimit.setHours(dateLimit.getHours() - hours);
            const dateLimitStr = dateLimit.toISOString().replace("T", " "); // PocketBase date format

            // Récupère les parties non terminées, non expirées, et plus vieilles que la limite
            const expiredRecords = await pb.collection('pokedeviner_stats').getFullList<MateloutreDleRecord>({
                filter: `success_at = "" && is_expired = false && created <= "${dateLimitStr}"`,
                requestKey: null
            });

            if (expiredRecords.length === 0) return;

            otterlogs.log(`PokedleStatsService: Expiration de ${expiredRecords.length} partie(s) abandonnée(s) de plus de ${hours}h.`);

            for (const record of expiredRecords) {
                try {
                    await pb.collection('pokedeviner_stats').update(record.id, { is_expired: true }, { requestKey: null });
                } catch (err) {
                    otterlogs.error(`PokedleStatsService: Erreur lors de l'expiration de la partie ${record.id}: ${err}`);
                }
            }
        } catch (error) {
            otterlogs.error(`PokedleStatsService: Erreur lors de la vérification des expirations: ${error}`);
        }
    }

    /**
     * Récupère toutes les victoires d'un utilisateur.
     * Utilisé par la sous-commande /pokedle stats.
     */
    static async getStatsForUser(discordUserId: string): Promise<MateloutreDleRecord[]> {
        try {
            const pbUserId = await findDiscordUserRecordId(discordUserId);
            if (!pbUserId) {
                otterlogs.warn(`PokedleStatsService: Utilisateur Discord ${discordUserId} introuvable dans discord_users.`);
                return [];
            }

            const pb = await OtterPocketBase.getClient();
            // On ne récupère que les parties gagnées (success_at n'est pas vide)
            const records = await pb.collection('pokedeviner_stats').getFullList<MateloutreDleRecord>({
                filter: `discord_user = "${pbUserId}" && success_at != ""`,
                sort:   '-created',
                requestKey: null
            });
            return records;
        } catch (error) {
            otterlogs.error(`PokedleStatsService: Erreur lors de la récupération des stats : ${error}`);
            return [];
        }
    }
}