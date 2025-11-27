import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { Article } from './articleScraper';
import { pokekalosConfig } from '../config/pokekalosConfig';

export async function notifyNewArticles(client: Client, articles: Article[]): Promise<void> {
    if (articles.length === 0 || !pokekalosConfig.channelId) return;

    try {
        const channel = await client.channels.fetch(pokekalosConfig.channelId) as TextChannel;

        if (!channel || !channel.isTextBased()) {
            console.error('[Pokekalos] Canal introuvable ou non textuel');
            return;
        }

        for (const article of articles) {
            const embed = new EmbedBuilder()
                .setTitle(article.title)
                .setURL(article.url)
                .setDescription(article.snippet || 'Nouvel article détecté sur Pokekalos')
                .setColor('#FF6B35')
                .addFields(
                    { name: 'Date', value: article.date || 'Non disponible', inline: true },
                    { name: 'Source', value: 'Pokekalos', inline: true }
                )
                .setTimestamp(article.scrapedAt)
                .setFooter({ text: 'Pokekalos Scraper' });

            if (article.imageUrl) {
                embed.setImage(article.imageUrl);
            }

            await channel.send({ embeds: [embed] });
        }

        console.log(`[Pokekalos] ${articles.length} notification(s) envoyée(s)`);
    } catch (error) {
        console.error('[Pokekalos] Erreur lors de l\'envoi des notifications:', error);
    }
}