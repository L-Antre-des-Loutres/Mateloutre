export interface TypeRefResponse {
    id: number;
    symbol: string;
    color: string;
}

export interface AbilityRefResponse {
    id: number;
    symbol: string;
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
    primaryAbility: AbilityRefResponse | null;
    secondaryAbility: AbilityRefResponse | null;
    hiddenAbility: AbilityRefResponse | null;
    tags: string[];
    height: number;
    weight: number;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeAttack: number;
    baseSpeDefense: number;
    baseSpeed: number;
    spriteUrl: string;
}

export type MoveLearnMethod = "LEVEL_UP" | "MACHINE" | "EGG" | "TUTOR";

export interface MoveResponse {
    id: number;
    symbol: string;
    type: TypeRefResponse | null;
    power: number;
    accuracy: number;
    pp: number;
}

export interface MovesetResponse {
    id: number;
    pkmnId: number;
    move: MoveResponse;
    learnMethod: MoveLearnMethod;
    learnLevel: number | null;
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

export interface AbilityTranslationResponse {
    language: string;
    name: string;
    description: string;
}

export interface MoveTranslationResponse {
    language: string;
    name: string;
    description: string;
}

// Spring Data pagination wrapper returned by list endpoints.
export interface PapiPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}
