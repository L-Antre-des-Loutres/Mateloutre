import { OtterCache } from '../../../otterbots/utils/ottercache/ottercache';

export interface PokedleReminder {
    userId: string;
    remindAt: number; // timestamp
}

export class PokedleReminderService {
    private static cache = new OtterCache<PokedleReminder>('pokedle_reminders.json');

    /**
     * Ajoute un rappel pour un utilisateur dans 24h.
     */
    static addReminder(userId: string): void {
        const remindAt = Date.now() + 24 * 60 * 60 * 1000; // 24 heures
        this.cache.set(userId, { userId, remindAt });
    }

    /**
     * Récupère tous les rappels qui sont arrivés à expiration (temps dépassé).
     */
    static getDueReminders(): PokedleReminder[] {
        const now = Date.now();
        return this.cache.values().filter(r => r.remindAt <= now);
    }

    /**
     * Supprime le rappel pour l'utilisateur.
     */
    static removeReminder(userId: string): void {
        this.cache.delete(userId);
    }
}
