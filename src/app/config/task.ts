// Examples of cron expressions:
//
// ┌──────────────────────────────────────────────────┐
// │  minute  hour  day-of-month  month  day-of-week  │
// └──────────────────────────────────────────────────┘
//
// Examples:
//  - Every day at midnight:
//      time = "0 0 * * *"
//      period = ""
//      expression = "0 0 * * *"
//
//  - Every Monday at 8 AM:
//      time = "0 8 * *"
//      period = "1"
//      expression = "0 8 * * 1"
//
//  - Every weekday at 9 AM (Monday to Friday):
//      time = "0 9 * *"
//      period = "MON-FRI"
//      expression = "0 9 * * MON-FRI"
//
//  - Every minute:
//      time = "* * * * *"
//      period = ""
//      expression = "* * * * *"


import {clientGatewayIntent} from "./client";
import {otterlogs} from "../../otterbots/utils/otterlogs";
import * as fs from "node:fs";
import path from "path";
import {fetchPokeNews} from "../scraper/pokeNewsScraper";
import {TextChannel, EmbedBuilder, ColorResolvable} from "discord.js";

const CACHE_FILE = path.join(__dirname, '../../../cache/pokekalos-latest-news.cache');

/**
 * Represents a list of scheduled tasks with their respective configurations.
 * Each task contains the following details:
 * - `name`: A string that specifies the name or description of the task.
 * - `time`: A cron-style string that defines when the task is scheduled to run.
 * - `task`: An asynchronous function to be executed at the specified time.
 */
export const tasks = [
    {name: "Pokekalos News Scraper", time: "*/15 * * * *", task: async () => scrapeNews(), period: ""}
];




// Function to be executed at the scheduled time
export async function scrapeNews() {
    otterlogs.log(`Lancement du scraping des actus de Pokekalos.`);

    try {
        // Ensure cache directory exists
        const cacheDir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const lastTitle = fs.existsSync(CACHE_FILE) ? fs.readFileSync(CACHE_FILE, 'utf-8') : '';
        const news = await fetchPokeNews(lastTitle);

        if (!news.length) {
            otterlogs.log('✅ Aucune nouvelle actu.');
            return;
        }

        const newsChannelId = process.env.NEWS_CHANNEL_ID;
        if (!newsChannelId) {
            otterlogs.error("NEWS_CHANNEL_ID not found in .env");
            return;
        }

        const channel = clientGatewayIntent.channels.cache.get(newsChannelId) as TextChannel;
        if (!channel) {
            otterlogs.error(`Channel with ID ${newsChannelId} not found.`);
            return;
        }

        // Envoi des articles du plus ancien au plus récent
        for (const article of news.slice().reverse()) {
            const message = `🗒️ Une nouvelle actualité Pokémon est en ligne sur Pokekalos.`;

            const embed = new EmbedBuilder()
                .setTitle(article.title)
                .setURL(article.link)
                .setDescription(`${article.description}\n🔗 [Lire l'article](${article.link})`)
                .setImage(article.image)
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .setFields(
                    { name: 'Source', value: 'Pokekalos', inline: true },
                    { name: 'Date', value: article.date, inline: true }
                )
                .setFooter({
                    text: process.env.BOT_NAME || "Mateloutre",
                    iconURL: clientGatewayIntent.user?.displayAvatarURL() || '',
                })
                .setTimestamp();

            await channel.send({ content: message, embeds: [embed] });

            otterlogs.log(`✅ Nouvelle actu envoyée : ${article.title}`);
        }

        // On ne met à jour le cache qu'après avoir tout envoyé
        fs.writeFileSync(CACHE_FILE, news[0].title);
    } catch (error) {
        otterlogs.error(`Erreur lors du scraping : ${error}`);
    }
}




