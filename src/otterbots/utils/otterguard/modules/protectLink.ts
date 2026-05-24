import {Client, Message, TextChannel} from "discord.js";
import {authorizedDomains, otterguardConfig} from "../../../../app/config/otterguardConfig";
import {otterguard_Embed, otterguard_EmbedModeration} from "../embed";
import {otterlogs} from "../../otterlogs";

/**
 * Monitors and handles messages in a Discord server to enforce restrictions on URLs and links. It performs checks to delete messages
 * containing unauthorized or unwanted links, such as `http://` links, Discord invitations, or URLs from unapproved domains.
 * Informative messages are sent to the user if their message is removed.
 *
 * @param {Client} client - The Discord.js client instance used to interact with the Discord API and listen for message events.
 * @param message
 * @return {Promise<void>} Resolves when the function completes its asynchronous operations for processing messages.
 */
export async function otterguard_protectLink(client: Client, message: Message) {
    try {
        let reason, titleContent

        // Check if the link protection feature is enabled
        if (!otterguardConfig.protectLink) return

        // Check if the link is a discord invite
        if (message.content.includes('discord.gg/')) {
            try {

                try {
                    await message.delete();
                } catch {
                    return;
                }

                if (process.env.BOT_LANGUAGE.toLowerCase() == "fr") {
                    titleContent = `Envoi d'invitation Discord interdite.`
                    reason = `${message.author}, l'envoi d'invitation vers d'autres serveurs Discord est interdit sur le serveur ${process.env.DISCORD_NAME}. Merci de contacter un administrateur pour plus d'informations.`
                } else {
                    titleContent = `Discord invite sending prohibited.`
                    reason = `${message.author}, sending invitations to other Discord servers is prohibited on the server ${process.env.DISCORD_NAME}. Please contact an administrator for more information.`
                }

                // Send the message to the user
                await message.author.send({
                    embeds: [otterguard_Embed(titleContent, reason)]
                });

                // Send a message to the moderators log channel
                if (!process.env.MODERATION_CHANNEL_ID) {
                    otterlogs.warn('MODERATION_CHANNEL_ID is not set in the environment variables.');
                }
                const modLogChannel = await client.channels.fetch(process.env.MODERATION_CHANNEL_ID!) as TextChannel;
                if (modLogChannel && modLogChannel.isTextBased()) {
                    const title = process.env.BOT_LANGUAGE?.toLowerCase() === "fr" ?
                        'Invitation Discord supprimée par OtterGuard' :
                        'Discord invite deleted by OtterGuard';
                    const reason = process.env.BOT_LANGUAGE?.toLowerCase() === "fr" ?
                        `Le message de ${message.author} contenant l'invitation non autorisée a été supprimé.` :
                        `Message from ${message.author} containing unauthorized discord invite has been deleted.`;

                    await modLogChannel.send({
                        embeds: [otterguard_EmbedModeration(title, reason, message.content)]
                    });
                }

            } catch (error) {
                otterlogs.error('Error handling discord invite: ' + error);
            }
            return
        }

        // Check if the message contains a link
        if (!message.content.includes('http://') && !message.content.includes('https://')) return;

        // Check if the link is http://
        if (message.content.includes('http://')) {
            try {

                try {
                    await message.delete();
                } catch {
                    return;
                }

                if (process.env.BOT_LANGUAGE.toLowerCase() == "fr") {
                    titleContent = `Lien HTTP non autorisé.`
                    reason = `${message.author}, les liens http:// ne sont pas autorisés sur le serveur ${process.env.DISCORD_NAME}.`
                } else {
                    titleContent = `HTTP link not authorized.`
                    reason = `${message.author}, HTTP links are not allowed on the server ${process.env.DISCORD_NAME}.`
                }

                // Send the message to the user
                await message.author.send({
                    embeds: [otterguard_Embed(titleContent, reason)]
                });

                // Send a message to the moderators log channel
                if (!process.env.MODERATION_CHANNEL_ID) {
                    otterlogs.warn('MODERATION_CHANNEL_ID is not set in the environment variables.');
                }
                const modLogChannel = await client.channels.fetch(process.env.MODERATION_CHANNEL_ID!) as TextChannel;
                if (modLogChannel && modLogChannel.isTextBased()) {
                    const title = process.env.BOT_LANGUAGE?.toLowerCase() === "fr" ?
                        'Lien HTTP supprimé par OtterGuard' :
                        'HTTP link deleted by OtterGuard';
                    const content = process.env.BOT_LANGUAGE?.toLowerCase() === "fr" ?
                        `Le message de ${message.author} contenant le lien HTTP non autorisé a été supprimé.` :
                        `Message from ${message.author} containing unauthorized HTTP link has been deleted.`;

                    await modLogChannel.send({
                        embeds: [otterguard_EmbedModeration(title, content, message.content)]
                    });
                }

            } catch (error) {
                otterlogs.error('Error handling http:// link: ' + error);
            }
            return
        }

        // Check if the link has an authorized domain
        if (message.content.includes('https://')) {
            try {
                const link = message.content.match(/https?:\/\/[^\s]*/)?.[0] || '';
                const domainFound = authorizedDomains.some(domain => link.includes(domain));
                if (!domainFound) {

                    try {
                        await message.delete();
                    } catch {
                        return;
                    }

                    // Send a message to the user with the link and the reason for the deletion
                    if (process.env.BOT_LANGUAGE.toLowerCase() == "fr") {
                        titleContent = `Ce site n'est pas autorisé.`
                        reason = `${message.author}, l'url ${link} n'est pas autorisé sur le serveur ${process.env.DISCORD_NAME}, si cela est une erreur merci de contacter un administrateur.`
                    } else {
                        titleContent = `This site is not authorized.`
                        reason = `${message.author} the url ${link} is not authorized on the server ${process.env.DISCORD_NAME}, if this is an error please contact an administrator.`
                    }

                    // Send the message to the user
                    await message.author.send({
                        embeds: [otterguard_EmbedModeration(titleContent, reason, message.content)]
                    });

                    // Send a message to the moderators log channel
                    if (!process.env.MODERATION_CHANNEL_ID) {
                        otterlogs.warn('MODERATION_CHANNEL_ID is not set in the environment variables.');
                    }
                    const modLogChannel = await client.channels.fetch(process.env.MODERATION_CHANNEL_ID!) as TextChannel;
                    if (modLogChannel && modLogChannel.isTextBased()) {
                        const title = process.env.BOT_LANGUAGE?.toLowerCase() === "fr" ?
                            'Lien supprimé par OtterGuard' :
                            'Link deleted by OtterGuard';
                        const content = process.env.BOT_LANGUAGE?.toLowerCase() === "fr" ?
                            `Le message de ${message.author} contenant le lien non autorisé ${link} a été supprimé.` :
                            `Message from ${message.author} containing unauthorized link ${link} has been deleted.`;

                        await modLogChannel.send({
                            embeds: [otterguard_EmbedModeration(title, content, message.content)]
                        });
                    }

                }
            } catch (error) {
                otterlogs.error('Error handling https:// link: '  + error);
            }
            return
        }
    } catch (error) {
        otterlogs.error('Error in message handler: ' + error);
    }
}
