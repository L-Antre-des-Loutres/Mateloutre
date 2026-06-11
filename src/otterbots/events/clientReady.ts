import {Client} from "discord.js";
import {otterlogs} from "../utils/otterlogs";
import {PapiService} from "../../app/utils/papi/papiService";

/**
 * This method sets up an events listener for the 'clientReady' events on the provided client instance
 * and logs a success message when the bot is ready.
 *
 * @param {Client} client - The client instance representing the bot.
 * @return {Promise<void>} A promise that resolves when the listener is successfully set up.
 */
export async function otterBots_clientReady(client: Client) : Promise<void> {
    client.on('clientReady', async () => {
        const now = new Date()
        otterlogs.success(`Bot is ready at ${now.toLocaleString()} for ${client.user?.tag}!`)
        otterlogs.debug("Bot is actually in dev mode (to switch to production mode, change NODE_ENV in .env file)")

        // Pre-fill Pokedle cache
        otterlogs.debug("Pre-loading Pokedle data from PAPI...")
        await PapiService.getAllPokemonForPokedle().then(() => {
            otterlogs.success("Pokedle data loaded successfully.")
        }).catch(err => {
            otterlogs.error(`Failed to pre-load Pokedle data: ${err}`)
        })
    })
}