export interface DiscordUserRecord {
    id: string;
    username: string;
    discord_id: string;
    discord_tag: string;
    avatar_url: string;
    roles: unknown; // Type JSON dans PocketBase (peut être un tableau ou un objet)
    joined_at: string;
    first_active_at: string;
    last_active_at: string;
    delete_at: string;
    is_verified: boolean;
    created: string;
    updated: string;
}
