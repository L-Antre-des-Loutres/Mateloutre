export interface PokemonData {
    id: number;
    name: string;
    type1: string;
    type2: string | null;
    generation: number;
    height: number;
    weight: number;
    artworkUrl?: string;
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
 * Utilise la logique Squirdle simplifiée :
 * - exact : même type à la même position (ou les deux nuls pour type2)
 * - partial : type présent mais à l'autre position
 * - wrong : type absent
 */
export function comparePokemonV2(guess: PokemonData, target: PokemonData): Comparison {
    return {
        type1: guess.type1 === target.type1 ? "exact" : (guess.type1 === target.type2 ? "partial" : "wrong"),
        type2: guess.type2 === target.type2 ? "exact" : (guess.type2 === target.type1 ? "partial" : "wrong"),
        generation: compareNumeric(guess.generation, target.generation),
        height: compareNumeric(guess.height, target.height),
        weight: compareNumeric(guess.weight, target.weight),
    };
}

function compareNumeric(guess: number, target: number): ComparisonResult {
    if (guess === target) return "exact";
    return guess < target ? "higher" : "lower";
}
