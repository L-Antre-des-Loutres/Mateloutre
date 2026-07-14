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
