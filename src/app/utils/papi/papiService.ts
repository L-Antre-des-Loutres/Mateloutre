import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import {
    PkmnResponse,
    PkmnSummaryResponse,
    PkmnTranslationResponse,
    TypeTranslationResponse,
    TypeRefResponse,
    AbilityTranslationResponse,
    MoveTranslationResponse
} from './types/pokemon';
import { PokemonData } from '../pokedle/gameLogic';

export class PapiService {
    private static pokemonCache: PokemonData[] | null = null;
    private static typeCache: Map<number, string> = new Map();
    private static abilityNameCache: Map<number, string> = new Map();
    private static moveNameCache: Map<number, string> = new Map();

    /**
     * Fetches all pokemon and their French translations, then maps them to PokemonData.
     * Uses a cache to avoid repeated heavy API calls.
     */
    static async getAllPokemonForPokedle(forceRefresh = false): Promise<PokemonData[]> {
        if (this.pokemonCache && !forceRefresh) {
            return this.pokemonCache;
        }

        try {
            // 1. Get all pokemon summaries
            const response = await apiClient.get<{ content: PkmnSummaryResponse[] }>(`${ENDPOINTS.pokemon.base}?size=2000`);
            const summaries = response.content;

            // 2. Fetch all types names first to fill the type cache
            const typeSummaries = await apiClient.get<{ content: TypeRefResponse[] }>(`${ENDPOINTS.types.base}?size=100`);
            await Promise.all(typeSummaries.content.map(t => this.getTypeName(t.id, 'FR')));

            // 3. Fetch details for all pokemon in parallel with limited concurrency
            const concurrencyLimit = 10;
            const pokemonDataList: (PokemonData | null)[] = [];
            
            for (let i = 0; i < summaries.length; i += concurrencyLimit) {
                const chunk = summaries.slice(i, i + concurrencyLimit);
                const results = await Promise.all(chunk.map(async (summary) => {
                    try {
                        if (!summary.primaryType) return null;

                        const [details, translations] = await Promise.all([
                            apiClient.get<PkmnResponse>(ENDPOINTS.pokemon.byId(summary.id)),
                            apiClient.get<PkmnTranslationResponse[]>(ENDPOINTS.pokemon.translations(summary.id))
                        ]);

                        const frTranslation = translations.find(t => t.language === 'FR') || translations.find(t => t.language === 'EN');

                        const type1Translation = await this.getTypeName(summary.primaryType.id, 'FR');
                        const type2Translation = summary.secondaryType ? await this.getTypeName(summary.secondaryType.id, 'FR') : null;

                        // 5. Determine generation from tags (e.g., "gen1") or Dex Number
                        let generation = 1;
                        const genTag = details.tags.find(tag => /^gen\d+$/.test(tag));
                        if (genTag) {
                            generation = parseInt(genTag.match(/\d+/)![0]);
                        } else if (details.nationalDexNumber) {
                            generation = this.inferGeneration(details.nationalDexNumber);
                        }

                        return {
                            id: details.id,
                            name: frTranslation?.pkmnName || summary.symbol,
                            type1: type1Translation,
                            type2: type2Translation,
                            generation: generation,
                            height: details.height / 100,
                            weight: details.weight,
                        };
                    } catch (e) {
                        console.error(`Error fetching details for pokemon ${summary.id}:`, e);
                        return null;
                    }
                }));
                pokemonDataList.push(...results);
            }

            this.pokemonCache = pokemonDataList.filter((p): p is PokemonData => p !== null);
            return this.pokemonCache;
        } catch (error) {
            console.error('Error fetching pokemon from PAPI:', error);
            return this.pokemonCache || [];
        }
    }

    private static async getTypeName(typeId: number, lang: string): Promise<string> {
        if (this.typeCache.has(typeId)) {
            return this.typeCache.get(typeId)!;
        }

        try {
            const translations = await apiClient.get<TypeTranslationResponse[]>(ENDPOINTS.types.translations(typeId));
            const translation = translations.find(t => t.language === lang) || translations.find(t => t.language === 'EN');
            const name = translation?.name || 'Inconnu';
            this.typeCache.set(typeId, name);
            return name;
        } catch {
            return 'Inconnu';
        }
    }

    /** French type name, backed by the shared type cache. */
    static async getTypeNameFr(typeId: number): Promise<string> {
        return this.getTypeName(typeId, 'FR');
    }

    /** French ability name, cached across calls. */
    static async getAbilityNameFr(abilityId: number): Promise<string> {
        if (this.abilityNameCache.has(abilityId)) {
            return this.abilityNameCache.get(abilityId)!;
        }
        try {
            const translations = await apiClient.get<AbilityTranslationResponse[]>(ENDPOINTS.abilities.translations(abilityId));
            const name = (translations.find(t => t.language === 'FR') || translations.find(t => t.language === 'EN'))?.name || 'Inconnu';
            this.abilityNameCache.set(abilityId, name);
            return name;
        } catch {
            return 'Inconnu';
        }
    }

    /** French move name, cached across calls. */
    static async getMoveNameFr(moveId: number): Promise<string> {
        if (this.moveNameCache.has(moveId)) {
            return this.moveNameCache.get(moveId)!;
        }
        try {
            const translations = await apiClient.get<MoveTranslationResponse[]>(ENDPOINTS.moves.translations(moveId));
            const name = (translations.find(t => t.language === 'FR') || translations.find(t => t.language === 'EN'))?.name || 'Inconnu';
            this.moveNameCache.set(moveId, name);
            return name;
        } catch {
            return 'Inconnu';
        }
    }

    /** Maps each pokemon id to its French name, reusing the Pokedle cache. */
    static async getPokemonNameMap(): Promise<Map<number, string>> {
        const list = await this.getAllPokemonForPokedle();
        return new Map(list.map(p => [p.id, p.name]));
    }

    private static inferGeneration(dexNumber: number): number {
        if (dexNumber <= 151) return 1;
        if (dexNumber <= 251) return 2;
        if (dexNumber <= 386) return 3;
        if (dexNumber <= 493) return 4;
        if (dexNumber <= 649) return 5;
        if (dexNumber <= 721) return 6;
        if (dexNumber <= 809) return 7;
        if (dexNumber <= 898) return 8;
        return 9;
    }
}

