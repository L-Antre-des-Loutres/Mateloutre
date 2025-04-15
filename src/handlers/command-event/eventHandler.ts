import { Client } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { BotEvent } from "../../types";
import otterlogs from "../../utils/otterlogs";

module.exports = (client: Client) => {
    let eventsDir = join(__dirname, "../../events");

    readdirSync(eventsDir).forEach(file => {
        if (!file.endsWith(".js")) return;

        const event: BotEvent = require(`${eventsDir}/${file}`).default;

        event.once 
        ? client.once(event.name, (...args) => event.execute(...args))
        : client.on(event.name, (...args) => event.execute(...args))

        otterlogs.success(`Event "${event.name}" prêt (${file})`);
    })
}