export const POKE_RECHERCHE_CONSTANTS = {
    // Command
    COMMAND_NAME: "poke-recherche",
    COMMAND_DESCRIPTION: "Recherche un Pokémon ou un groupe de Pokémon",

    // Type option and its two values
    OPTION_TYPE_NAME: "type",
    OPTION_TYPE_DESCRIPTION: "Rechercher un Pokémon ou un groupe de Pokémon",
    TYPE_POKEMON: "pokemon",
    TYPE_GROUP: "groupe",
    TYPE_POKEMON_LABEL: "Pokémon",
    TYPE_GROUP_LABEL: "Groupe",

    // Value option (autocompleted depending on the type above)
    OPTION_VALUE_NAME: "valeur",
    OPTION_VALUE_DESCRIPTION: "Le Pokémon ou le groupe recherché",

    // Embed labels
    EMBED_GROUP_TITLE: "{group} - {count} Pokémon",

    // Messages
    MSG_NO_DATA: "Désolé, impossible de charger les données des Pokémon pour le moment.",
    MSG_POKEMON_NOT_FOUND: "Aucun Pokémon ne correspond à cette recherche.",
    MSG_GROUP_NOT_FOUND: "Ce groupe de Pokémon n'existe pas.",
    MSG_GROUP_EMPTY: "Aucun Pokémon trouvé pour le groupe **{group}**.",
};

export interface PokeTag {
    // Tag as stored on the Pokémon in the API
    tag: string;
    // Label shown in the command's select / autocomplete
    label: string;
}

/**
 * Configurable table of searchable groups.
 * Add a line here to expose a new group in the /poke-recherche autocomplete.
 */
export const POKE_TAGS: PokeTag[] = [
    { tag: "gen-i",    label: "Génération 1 (Kanto)" },
    { tag: "gen-ii",   label: "Génération 2 (Johto)" },
    { tag: "gen-iii",  label: "Génération 3 (Hoenn)" },
    { tag: "gen-iv",   label: "Génération 4 (Sinnoh)" },
    { tag: "gen-v",    label: "Génération 5 (Unys)" },
    { tag: "gen-vi",   label: "Génération 6 (Kalos)" },
    { tag: "gen-vii",  label: "Génération 7 (Alola)" },
    { tag: "gen-viii", label: "Génération 8 (Galar)" },
    { tag: "gen-ix",   label: "Génération 9 (Paldea)" },
    { tag: "legendary", label: "Légendaires" },
    { tag: "mythical",  label: "Mythiques" },
    { tag: "baby",      label: "Bébés Pokémon" },
];

/**
 * Maps a Pokémon type (French name) to a custom application emoji (<:name:id>).
 * Add or tweak entries here; unknown types fall back to DEFAULT_TYPE_EMOJI.
 */
export const TYPE_EMOJIS: Record<string, string> = {
    "Normal":    "<:normal:1526689871543144698>",
    "Combat":    "<:fighting:1526689862101504170>",
    "Vol":       "<:flying:1526689864765149184>",
    "Poison":    "<:poison:1526689872935649382>",
    "Sol":       "<:ground:1526689868791676978>",
    "Roche":     "<:rock:1526689876177588345>",
    "Insecte":   "<:bug:1526689854174400653>",
    "Spectre":   "<:ghost:1526689865872183489>",
    "Acier":     "<:steel:1526689877394194575>",
    "Feu":       "<:fire:1526689863292948551>",
    "Eau":       "<:water:1526689880183406622>",
    "Plante":    "<:grass:1526689867436789781>",
    "Électrik":  "<:electric:1526689859509555220>",
    "Psy":       "<:psychic:1526689874365911121>",
    "Glace":     "<:ice:1526689870146441328>",
    "Dragon":    "<:dragon:1526689857580040212>",
    "Ténèbres":  "<:dark:1526689855281692692>",
    "Fée":       "<:fairy:1526689860797333674>",
    "Stellaire": "<:stellar:1526689878820131080>",
};

// Shown when a type has no entry in the map above
export const DEFAULT_TYPE_EMOJI = "<:unknown:1526699126061006998>";

/**
 * Returns the emoji for a type (case-insensitive), or the fallback if unknown.
 */
export function getTypeEmoji(type: string): string {
    const match = Object.keys(TYPE_EMOJIS).find(k => k.toLowerCase() === type.toLowerCase());
    return match ? TYPE_EMOJIS[match] : DEFAULT_TYPE_EMOJI;
}
