import { EmbedBuilder } from "discord.js";

/**
 * Creates and returns an embed message object with a specified title and message content, formatted for use in applications like Discord.
 *
 * @param {string} title - The title of the embed message.
 * @param {string} messageContent - The main content or description of the embed message.
 * @return {EmbedBuilder} An instance of EmbedBuilder containing the formatted embed message.
 */
export function otterguard_Embed(title: string, messageContent: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x2B2D31) // Modern dark gray/embed background style or use 0x0099FF for accent. Let's go with a clean accent.
        .setAuthor({ name: 'Otterguard' }) // Removed potentially invalid iconURL.
        .setTitle(title)
        .setDescription(messageContent)
        .setTimestamp()
        .setFooter({ text: 'Otterguard System' });
}

/**
 * Creates and returns a formatted EmbedBuilder instance for moderation purposes.
 *
 * @param {string} title - The title to be displayed in the embed.
 * @param {string} reason - The main content or description to appear in the embed.
 * @param {string} messageContent - (Optional) Additional context or message content.
 * @return {EmbedBuilder} A configured EmbedBuilder instance with the specified title, description, timestamp, and footer.
 */
export function otterguard_EmbedModeration(title: string, reason: string, messageContent?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xED4245) // Discord Red
        .setAuthor({ name: '🛡️ OtterGuard Moderation' })
        .setTitle(title)
        .setDescription(`**Reason:**\n${reason}`)
        .setTimestamp()
        .setFooter({ text: 'Otterguard - Moderation Team' });

    if (messageContent) {
        embed.addFields({ name: '📝 Context / Content', value: messageContent.substring(0, 1024) });
    }

    return embed;
}
