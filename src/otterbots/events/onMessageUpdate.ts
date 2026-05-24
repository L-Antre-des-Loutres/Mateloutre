import {Client} from "discord.js";
import {otterguard_protectLink} from "../utils/otterguard/modules/protectLink";
import {otterguard_protectScam} from "../utils/otterguard/modules/protectScam";
import {otterguard_protectSpam} from "../utils/otterguard/modules/protectSpam";

export async function otterguard_onMessageUpdate(client: Client) {
    client.on('messageUpdate', async (_oldMessage, newMessage) => {
        // Check if the message is from a bot
        if (newMessage.author.bot) return;

        // Start protections
        await otterguard_protectLink(client, newMessage)
        await otterguard_protectScam(client, newMessage)
        await otterguard_protectSpam(client, newMessage)

    })
}
