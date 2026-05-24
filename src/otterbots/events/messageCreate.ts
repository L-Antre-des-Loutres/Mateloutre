import {otterguard_protectLink} from "../utils/otterguard/modules/protectLink";
import {Client} from "discord.js";
import {otterguard_protectScam} from "../utils/otterguard/modules/protectScam";
import {otterguard_protectSpam} from "../utils/otterguard/modules/protectSpam";

/**
 * Handles the `messageCreate` event and applies protection mechanisms to incoming messages.
 *
 * @param {Client} client - The Discord client instance that listens for the `messageCreate` event.
 * @return {Promise<void>} Resolves when the protections have been applied to the message.
 */
export async function otterguard_messageCreate(client: Client): Promise<void> {
    client.on('messageCreate', async (message) => {
        // Check if the message is from a bot
        if (message.author.bot) return;

        // Start protections
        await otterguard_protectLink(client, message)
        await otterguard_protectScam(client, message)
        await otterguard_protectSpam(client, message)

    })
}
