import {otterlogs} from "../otterlogs";
import {Client} from "discord.js";
import {otterguard_messageCreate} from "../../events/messageCreate";
import {otterguard_onMessageUpdate} from "../../events/onMessageUpdate";

/**
 * Initializes the Otterguard protection system for the provided client.
 * This function sets up message monitoring and logs the activation status.
 *
 * @param {Client} client - The client instance on which the Otterguard protection system will be initialized.
 * @return {void} This method does not return any value.
 */
export function otterbots_otterguard(client: Client): void {
    otterlogs.success("Otterguard is working!")
    otterguard_messageCreate(client).then(() => otterlogs.debug("Otterguard protection : messageCreate is enabled!"))
    otterguard_onMessageUpdate(client).then(() => otterlogs.debug("Otterguard protection : messageUpdate is enabled!"))

}

