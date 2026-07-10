/**
 * Pokemon groups offered by /recherche-poke
 */

export interface PokemonGroup {
    /** Label shown in Discord autocomplete. */
    label: string;
    /** Matching PAPI tag (must exist in the database). */
    tag: string;
}

export const POKEMON_GROUPS: PokemonGroup[] = [
    // Generations
    { label: "1ère génération", tag: "1g" },
    { label: "2ème génération", tag: "2g" },
    { label: "3ème génération", tag: "3g" },
    { label: "4ème génération", tag: "4g" },
    { label: "5ème génération", tag: "5g" },
    { label: "6ème génération", tag: "6g" },
    { label: "7ème génération", tag: "7g" },
    { label: "8ème génération", tag: "8g" },
    { label: "9ème génération", tag: "9g" },

    // Thematic groups
    { label: "Starters", tag: "starter" },
    { label: "Méga-évolutions", tag: "mega" },
    { label: "Formes régionales", tag: "regional-form" },
    { label: "Ultra-Chimères", tag: "ultra-beast" },
    { label: "Pokémon de l'Antres des Loutres (RLM)", tag: "rlm" },
];
