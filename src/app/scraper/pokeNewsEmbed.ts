import { ColorResolvable, EmbedBuilder } from 'discord.js';
import { NewsArticle, resolveNewsUrl } from './pokeNewsScraper';

interface NewsEmbedOptions {
    color?: ColorResolvable;
    botName?: string;
    avatarURL?: string;
}

export function createPokeNewsEmbed(article: NewsArticle, options: NewsEmbedOptions = {}): EmbedBuilder {
    const link = resolveNewsUrl(article.link);
    if (!link) throw new Error(`Pokekalos : lien d’article invalide pour « ${article.title} ».`);

    const title = article.title.trim().slice(0, 256);
    const footerText = (options.botName?.trim() || 'Mateloutre').slice(0, 2048);
    const fields = [{ name: 'Source', value: 'Pokekalos', inline: true }];
    if (article.date.trim()) fields.push({ name: 'Date', value: article.date.trim().slice(0, 1024), inline: true });

    // Leave room for the source link and respect both per-field and total embed limits.
    const textLength = title.length + footerText.length + fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0);
    const descriptionLimit = Math.min(4096, 6000 - textLength);
    const sourceLink = `🔗 [Lire l'article](${link})`;
    const description = article.description.trim().slice(0, Math.max(0, descriptionLimit - sourceLink.length - 1));
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setURL(link)
        .setDescription(`${description ? `${description}\n` : ''}${sourceLink}`.slice(0, descriptionLimit))
        .setColor(options.color ?? '#f89800')
        .setFields(fields)
        .setTimestamp();

    const image = resolveNewsUrl(article.image);
    if (image) embed.setImage(image);
    const avatarURL = resolveNewsUrl(options.avatarURL);
    embed.setFooter(avatarURL ? { text: footerText, iconURL: avatarURL } : { text: footerText });
    return embed;
}
