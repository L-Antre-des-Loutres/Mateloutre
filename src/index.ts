import {Otterbots} from "./otterbots";
import {scrapeNews} from "./app/config/task";

// Get bot instance
const bot = new Otterbots();

// Start the bot
bot.start();
bot.setActivity("watching", "Who's that Pokémon?!")

// Start tasks
bot.initTask()

import {PapiService} from "./app/utils/papi/papiService";

// Trigger initial scraping once the bot is ready
bot.getClient().on('clientReady', async () => {
    await scrapeNews();
    // Pre-load Pokemon cache for Autocomplete
    PapiService.getAllPokemonForPokedle().catch(console.error);
});
