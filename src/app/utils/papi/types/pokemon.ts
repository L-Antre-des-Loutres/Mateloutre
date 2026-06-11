export interface TypeRefResponse {
    id: number;
    symbol: string;
    color: string;
}

export interface PkmnSummaryResponse {
    id: number;
    symbol: string;
    nationalDexNumber: number;
    primaryType: TypeRefResponse | null;
    secondaryType: TypeRefResponse | null;
    spriteUrl: string;
}

export interface PkmnResponse {
    id: number;
    symbol: string;
    nationalDexNumber: number;
    primaryType: TypeRefResponse | null;
    secondaryType: TypeRefResponse | null;
    tags: string[];
    height: number;
    weight: number;
    spriteUrl: string;
    // ... other fields if needed, but these are the ones for Pokedle
}

export interface PkmnTranslationResponse {
    language: string;
    pkmnName: string;
    formName: string;
    description: string;
}

export interface TypeTranslationResponse {
    language: string;
    name: string;
}
