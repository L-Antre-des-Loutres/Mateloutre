import otterlogs from "../utils/otterlogs";
import * as fs from "node:fs";
import path from "path";
import {fetchPokeNews} from "../scraper/pokeNewsScraper";
import {Client, TextChannel, EmbedBuilder, ColorResolvable} from "discord.js";

const CACHE_FILE = path.join(__dirname, '../../cache/pokekalos-latest-news.cache');

let client: Client;

export function pokeScrapinitialize(discordClient: Client) {
    client = discordClient;
    scrape().catch(err => {
        console.error("❌ Erreur initiale du scraping :", err);
    });
}

setInterval(async () => {
    await scrape();
}, 1000 * 60 * 15); // toutes les 30 minutes

// Fonction de scraping
async function scrape() {

    otterlogs.log(`Lancement du scraping des actus de Pokekalos.`);

    try {
        const lastTitle = fs.existsSync(CACHE_FILE) ? fs.readFileSync(CACHE_FILE, 'utf-8') : '';
        const news = await fetchPokeNews(lastTitle);

        if (!news.length) {
            otterlogs.log('✅ Aucune nouvelle actu.');
            return;
        }

        const channel = client.channels.cache.get(process.env.NEWS_CHANNEL_ID) as TextChannel;

        // Envoi des articles du plus ancien au plus récent
        for (const article of news.slice().reverse()) {
            const message = `🗒️ Une nouvelle actualité Pokémon est en ligne sur Pokekalos.`;

            const embed = new EmbedBuilder()
                .setTitle(article.title)
                .setURL(article.link)
                .setDescription(`${article.description}\n🔗 [Lire l'article](${article.link})`)
                .setImage(article.image)
                .setColor(process.env.BOT_COLOR as ColorResolvable)
                .setFields(
                    { name: 'Source', value: 'Pokekalos', inline: true },
                    { name: 'Date', value: article.date, inline: true }
                )
                .setFooter({
                    text: "Mineotter",
                    iconURL: client.user?.displayAvatarURL() || '',
                })
                .setTimestamp();

            await channel.send({ content: message, embeds: [embed] });

            otterlogs.log(`✅ Nouvelle actu envoyée : ${article.title}`);
        }

        // ⚠️ On ne met à jour le cache qu'après avoir tout envoyé
        fs.writeFileSync(CACHE_FILE, news[0].title); // Le plus récent est news[0]
    } catch (error) {
        console.error("Erreur lors du scraping :", error);
    }
}