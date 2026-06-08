// All paths are relative, the client defines the base URL at runtime.

export const ENDPOINTS = {

    health: '/api/health',

    auth: {
        login: '/api/auth/login',
    },

    abilities: {
        base:        '/api/abilities',
        count:       '/api/abilities/count',
        default:     '/api/abilities/default',
        byId:        (id: number) => `/api/abilities/${id}`,
        symbol:      (id: number) => `/api/abilities/${id}/symbol`,
        translations:(id: number) => `/api/abilities/${id}/translations`,
        translation: (id: number, lang: string) => `/api/abilities/${id}/translations/${lang}`,
    },

    moves: {
        base:        '/api/moves',
        count:       '/api/moves/count',
        default:     '/api/moves/default',
        byId:        (id: number) => `/api/moves/${id}`,
        symbol:      (id: number) => `/api/moves/${id}/symbol`,
        type:        (id: number) => `/api/moves/${id}/type`,
        power:       (id: number) => `/api/moves/${id}/power`,
        accuracy:    (id: number) => `/api/moves/${id}/accuracy`,
        pp:          (id: number) => `/api/moves/${id}/pp`,
        translations:(id: number) => `/api/moves/${id}/translations`,
        translation: (id: number, lang: string) => `/api/moves/${id}/translations/${lang}`,
    },

    pokemon: {
        base:             '/api/pokemon',
        count:            '/api/pokemon/count',
        default:          '/api/pokemon/default',
        byId:             (id: number) => `/api/pokemon/${id}`,
        symbol:           (id: number) => `/api/pokemon/${id}/symbol`,
        nationalDexNumber:(id: number) => `/api/pokemon/${id}/nationalDexNumber`,
        primaryType:      (id: number) => `/api/pokemon/${id}/primaryType`,
        secondaryType:    (id: number) => `/api/pokemon/${id}/secondaryType`,
        tags:             (id: number) => `/api/pokemon/${id}/tags`,
        translations:     (id: number) => `/api/pokemon/${id}/translations`,
        translation:      (id: number, lang: string) => `/api/pokemon/${id}/translations/${lang}`,
        moveset:          (id: number) => `/api/pokemon/${id}/moveset`,
        movesetEntry:     (id: number, entryId: number) => `/api/pokemon/${id}/moveset/${entryId}`,
        images:           (id: number) => `/api/pokemon/${id}/images`,
        imageMain:        (id: number) => `/api/pokemon/${id}/images/main`,
        imageById:        (id: number, imageId: number) => `/api/pokemon/${id}/images/${imageId}`,
        promoteImageMain: (id: number, imageId: number) => `/api/pokemon/${id}/images/${imageId}/main`,
    },

    types: {
        base:        '/api/types',
        count:       '/api/types/count',
        default:     '/api/types/default',
        matchups:    '/api/types/matchups',
        byId:        (id: number) => `/api/types/${id}`,
        symbol:      (id: number) => `/api/types/${id}/symbol`,
        color:       (id: number) => `/api/types/${id}/color`,
        tags:        (id: number) => `/api/types/${id}/tags`,
        tag:         (id: number, tag: string) => `/api/types/${id}/tags/${tag}`,
        translations:(id: number) => `/api/types/${id}/translations`,
        translation: (id: number, lang: string) => `/api/types/${id}/translations/${lang}`,
        matchup:     (attackingId: number, defendingId: number) =>
                         `/api/types/matchups/${attackingId}/${defendingId}`,
    },

    movesets: {
        base:      '/api/movesets',
        byId:      (id: number) => `/api/movesets/${id}`,
        byPokemon: (pkmnId: number) => `/api/movesets/pkmn/${pkmnId}`,
    },

    users: {
        base:  '/api/users',
        byId:  (id: number) => `/api/users/${id}`,
    },

} as const;
