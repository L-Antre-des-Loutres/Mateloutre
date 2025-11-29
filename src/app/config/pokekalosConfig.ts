export const pokekalosConfig = {
    baseUrl: 'https://www.pokekalos.fr',
    articlesEndpoint: '/articles',
    updateInterval: 60 * 60 * 1000, // 1 heure en millisecondes
    maxArticles: 50,
    channelId: process.env.POKEKALOS_CHANNEL_ID || '', // À définir dans .env
};