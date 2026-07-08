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
        pbRecordId?: string
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
            };

            if (isWin) {
                payload.success_at = now.toISOString();
            } else if (!pbRecordId) {
                payload.success_at = ""; 
            }

            if (pbRecordId) {
                for (let attempts = 1; attempts <= 2; attempts++) {
                    try {
                        await pb.collection('pokedeviner_stats').update(pbRecordId, payload, { requestKey: null });
                        return pbRecordId;
                    } catch (updateError: unknown) {
                        if (updateError && typeof updateError === 'object' && 'status' in updateError && updateError.status === 0 && attempts < 2) {
                            otterlogs.warn(`PokedleStatsService: Fetch failed (Error 0) on update, retrying...`);
                            continue;
                        }
                        if (updateError && typeof updateError === 'object' && 'status' in updateError && updateError.status === 404) {
                            otterlogs.warn(`PokedleStatsService: Partie ${pbRecordId} introuvable (404). Recréation d'une nouvelle ligne.`);
                            pbRecordId = undefined; // Force la création
                            break; // Sort de la boucle de retry d'update
                        } else {
                            throw updateError;
                        }
                    }
                }
            }

            if (!pbRecordId) {
                payload.start_at = now.toISOString();
                for (let attempts = 1; attempts <= 2; attempts++) {
                    try {
                        const record = await pb.collection('pokedeviner_stats').create(payload, { requestKey: null });
                        otterlogs.debug(`PokedleStatsService: Nouvelle partie créée pour ${discordUserId} (ID: ${record.id}).`);
                        return record.id;
                    } catch (createError: unknown) {
                        if (createError && typeof createError === 'object' && 'status' in createError && createError.status === 0 && attempts < 2) {
                            otterlogs.warn(`PokedleStatsService: Fetch failed (Error 0) on create, retrying...`);
                            continue;
                        }
                        throw createError;
                    }
                }
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
            for (let attempts = 1; attempts <= 2; attempts++) {
                try {
                    const records = await pb.collection('pokedeviner_stats').getFullList<MateloutreDleRecord>({
                        filter: `discord_user = "${pbUserId}" && success_at != ""`,
                        sort:   '-created',
                        requestKey: null
                    });
                    return records;
                } catch (error: unknown) {
                    if (error && typeof error === 'object' && 'status' in error && error.status === 0 && attempts < 2) {
                        otterlogs.warn(`PokedleStatsService: Fetch failed (Error 0) on getStatsForUser, retrying...`);
                        continue;
                    }
                    throw error;
                }
            }
            return [];
        } catch (error) {
            otterlogs.error(`PokedleStatsService: Erreur lors de la récupération des stats : ${error}`);
            return [];
        }
    }
}