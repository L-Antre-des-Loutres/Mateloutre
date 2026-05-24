import {Events, Client} from "discord.js";

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client: Client) {
        client.emit('clientReady');
    },
};
