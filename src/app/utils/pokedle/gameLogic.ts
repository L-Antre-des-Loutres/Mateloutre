export interface PokemonData {
    id: number;
    name: string;
    type1: string;
    type2: string | null;
    generation: number;
    height: number;
    weight: number;
}

export type ComparisonResult = "exact" | "partial" | "wrong" | "higher" | "lower";

export interface Comparison {
    type1: ComparisonResult;
    type2: ComparisonResult;
    generation: ComparisonResult;
    height: ComparisonResult;
    weight: ComparisonResult;
}

/**
 * Compare deux Pokémon et renvoie les résultats de comparaison.
 */
export function comparePokemon(guess: PokemonData, target: PokemonData): Comparison {
    return {
        type1: compareTypes(guess.type1, target.type1, target.type2),
        type2: compareTypes(guess.type2, target.type1, target.type2),
        generation: compareNumeric(guess.generation, target.generation),
        height: compareNumeric(guess.height, target.height),
        weight: compareNumeric(guess.weight, target.weight),
    };
}

function compareTypes(guessType: string | null, targetType1: string, targetType2: string | null): ComparisonResult {
    if (!guessType) return "wrong";
    if (guessType === targetType1 || guessType === targetType2) {
        if (guessType === targetType1 || guessType === targetType2) {
             // Si c'est le type exact à la même position (si on voulait être strict), 
             // mais ici on fait comme Squirdle : si le type est présent n'importe où.
             // On va dire "exact" si c'est présent.
             return "exact";
        }
    }
    return "wrong";
}

// Pour le type 2, Squirdle a une logique un peu spéciale. 
// Si le Pokémon cible a 1 type et que tu devines un Pokémon à 1 type, et que c'est le même : 🟩.
// Si tu devines un type qui est présent mais pas à la bonne place ou si l'un a 2 types et l'autre 1 : 🟨.
// Ici on va simplifier pour la V1 :
export function comparePokemonV2(guess: PokemonData, target: PokemonData): Comparison {
    return {
        type1: guess.type1 === target.type1 ? "exact" : (guess.type1 === target.type2 ? "partial" : "wrong"),
        type2: guess.type2 === target.type2 ? (guess.type2 === null ? "exact" : "exact") : (guess.type2 === target.type1 ? "partial" : "wrong"),
        generation: compareNumeric(guess.generation, target.generation),
        height: compareNumeric(guess.height, target.height),
        weight: compareNumeric(guess.weight, target.weight),
    };
}

function compareNumeric(guess: number, target: number): ComparisonResult {
    if (guess === target) return "exact";
    return guess < target ? "higher" : "lower";
}

const EMOJIS = {
    exact: "🟩",
    partial: "🟨",
    wrong: "🟥",
    higher: "🔼",
    lower: "🔽"
};

/**
 * Formate une ligne de résultat avec des emojis.
 */
export function formatGuessResult(guess: PokemonData, target: PokemonData): string {
    const comp = comparePokemonV2(guess, target);
    
    return `${EMOJIS[comp.type1]}${EMOJIS[comp.type2]} ${EMOJIS[comp.generation]} ${EMOJIS[comp.height]} ${EMOJIS[comp.weight]} **${guess.name}**`;
}
