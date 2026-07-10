import { apiClient } from "../papi/client";
import { ENDPOINTS } from "../papi/endpoints";
import { PapiService } from "../papi/papiService";
import {
    MoveLearnMethod,
    MovesetResponse,
    PapiPage,
    PkmnResponse,
    PkmnSummaryResponse,
    PkmnTranslationResponse,
} from "../papi/types/pokemon";

// Cap the movepool shown on a fiche to keep name resolution and embed size bounded.
const MAX_MOVES = 40;
const MOVE_RESOLVE_CONCURRENCY = 10;

export interface FicheMove {
    name: string;
    method: MoveLearnMethod;
    level: number | null;
}

export interface FicheAbility {
    name: string;
    hidden: boolean;
}

export interface PokemonFiche {
    id: number;
    dex: number;
    name: string;
    description: string;
    spriteUrl: string;
    color: string | null;
    types: string[];
    abilities: FicheAbility[];
    stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; total: number };
    heightCm: number;
    weightKg: number;
    tags: string[];
    moves: FicheMove[];
    totalMoves: number;
}

/** Returns the summaries of every pokemon carrying the given tag. */
export async function searchByTag(tag: string): Promise<PkmnSummaryResponse[]> {
    const page = await apiClient.get<PapiPage<PkmnSummaryResponse>>(ENDPOINTS.pokemon.byTag(tag));
    return page.content ?? [];
}

/** Fetches a pokemon and resolves every displayed field to French. */
export async function getPokemonFiche(id: number): Promise<PokemonFiche> {
    const [details, translations, moveset] = await Promise.all([
        apiClient.get<PkmnResponse>(ENDPOINTS.pokemon.byId(id)),
        apiClient.get<PkmnTranslationResponse[]>(ENDPOINTS.pokemon.translations(id)),
        apiClient.get<MovesetResponse[]>(ENDPOINTS.pokemon.moveset(id)),
    ]);

    const translation = translations.find(t => t.language === "FR") || translations.find(t => t.language === "EN");

    const types = await Promise.all(
        [details.primaryType, details.secondaryType]
            .filter(t => t !== null)
            .map(t => PapiService.getTypeNameFr(t!.id))
    );

    const abilities = await resolveAbilities(details);
    const sortedMoves = [...moveset].sort(compareMoves);
    const moves = await resolveMoves(sortedMoves.slice(0, MAX_MOVES));

    return {
        id: details.id,
        dex: details.nationalDexNumber,
        name: translation?.pkmnName || details.symbol,
        description: translation?.description || "",
        spriteUrl: details.spriteUrl,
        color: details.primaryType?.color ?? null,
        types,
        abilities,
        stats: {
            hp: details.baseHp,
            atk: details.baseAttack,
            def: details.baseDefense,
            spa: details.baseSpeAttack,
            spd: details.baseSpeDefense,
            spe: details.baseSpeed,
            total: details.baseHp + details.baseAttack + details.baseDefense
                + details.baseSpeAttack + details.baseSpeDefense + details.baseSpeed,
        },
        heightCm: details.height,
        weightKg: details.weight,
        tags: details.tags ?? [],
        moves,
        totalMoves: moveset.length,
    };
}

async function resolveAbilities(details: PkmnResponse): Promise<FicheAbility[]> {
    const refs = [
        { ref: details.primaryAbility, hidden: false },
        { ref: details.secondaryAbility, hidden: false },
        { ref: details.hiddenAbility, hidden: true },
    ].filter(a => a.ref !== null);

    return Promise.all(refs.map(async a => ({
        name: await PapiService.getAbilityNameFr(a.ref!.id),
        hidden: a.hidden,
    })));
}

async function resolveMoves(entries: MovesetResponse[]): Promise<FicheMove[]> {
    const resolved: FicheMove[] = [];
    for (let i = 0; i < entries.length; i += MOVE_RESOLVE_CONCURRENCY) {
        const chunk = entries.slice(i, i + MOVE_RESOLVE_CONCURRENCY);
        const names = await Promise.all(chunk.map(e => PapiService.getMoveNameFr(e.move.id)));
        chunk.forEach((e, j) => resolved.push({ name: names[j], method: e.learnMethod, level: e.learnLevel }));
    }
    return resolved;
}

// Level-up moves first (by level), then machine, egg, tutor.
const METHOD_ORDER: Record<MoveLearnMethod, number> = { LEVEL_UP: 0, MACHINE: 1, EGG: 2, TUTOR: 3 };

function compareMoves(a: MovesetResponse, b: MovesetResponse): number {
    if (a.learnMethod !== b.learnMethod) {
        return METHOD_ORDER[a.learnMethod] - METHOD_ORDER[b.learnMethod];
    }
    return (a.learnLevel ?? 0) - (b.learnLevel ?? 0);
}
