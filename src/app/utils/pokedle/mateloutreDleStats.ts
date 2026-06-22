import { OtterPocketBase } from '../../../otterbots/utils/pocketbase/pocketbase';
import { otterlogs } from '../../../otterbots/utils/otterlogs';
import { findDiscordUserRecordId } from '../screenshotHelper';

/**
 * Collection : mateloutre_dle_stats
 */
export interface MateloutreDleRecord {
    id: string;
    discord_user: string;    // ID Discord de l'utilisateur
    nb_try: number;          // Nombre d'essais avant la victoire
    pokemon_name: string;    // Le Pokémon du jour trouvé
    success_at: string;      // Date/heure de la victoire (ISO)
    created: string;
    updated: string;
}
export class PokedleStatsService {

    /**
     * Enregistre une victoire dans PocketBase.
     * Appelé uniquement quand le joueur trouve le bon Pokémon.
     */
    static async saveWin(discordUserId: string, nbTry: number, pokemonName: string): Promise<void> {
        try {
            // Résolution de l'ID PocketBase de l'utilisateur Discord (champ relation)
            const pbUserId = await findDiscordUserRecordId(discordUserId);
            if (!pbUserId) {
                otterlogs.warn(`PokedleStatsService: Utilisateur Discord ${discordUserId} introuvable dans discord_users — victoire non enregistrée.`);
                return;
            }

            const pb = await OtterPocketBase.getClient();
            const successAt = new Date().toISOString().replace('T', ' ').replace('Z', '');
            await pb.collection('mateloutre_dle_stats').create({
                discord_user: pbUserId,
                nb_try:       nbTry,
                pokemon_name: pokemonName,
                success_at:   successAt,
            });
            otterlogs.debug(`PokedleStatsService: Victoire enregistrée pour ${discordUserId} (${pokemonName}, ${nbTry} essais).`);
        } catch (error: unknown) {
            otterlogs.error(`PokedleStatsService: Erreur lors de l'enregistrement de la victoire : ${error}`);
            if (error && typeof error === 'object' && 'data' in error) {
                otterlogs.error(`PokedleStatsService: Détails validation PB : ${JSON.stringify((error as { data: unknown }).data)}`);
            }
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
            const records = await pb.collection('mateloutre_dle_stats').getFullList<MateloutreDleRecord>({
                filter: `discord_user = "${pbUserId}"`,
                sort:   '-created',
            });
            return records;
        } catch (error) {
            otterlogs.error(`PokedleStatsService: Erreur lors de la récupération des stats : ${error}`);
            return [];
        }
    }
}