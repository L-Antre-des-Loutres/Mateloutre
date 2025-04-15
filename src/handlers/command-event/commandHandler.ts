import { Client, REST, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { SlashCommand } from "../../types";
import otterlogs from "../../utils/otterlogs";

module.exports = async (client: Client) => {
    const body: RESTPostAPIApplicationCommandsJSONBody[] = [];
    const slashCommandsDir = join(__dirname, "../../slashCommands");

    readdirSync(slashCommandsDir).forEach(file => {
        if (!file.endsWith(".js")) return

        try {
            const { command }: { command: SlashCommand } = require(`${slashCommandsDir}/${file}`);

            // Vérification que la commande possède bien la propriété 'data'
            if (!command || !command.data) {
                otterlogs.error(`La commande dans le fichier ${file} ne contient pas de propriété 'data'.`);
                return;
            }

            // Si tout est bon, ajoute la commande à la liste
            body.push(command.data.toJSON());
            otterlogs.success(`Commande ${command.name} chargée avec succès !`);
            client.slashCommands.set(command.name, command);
        } catch (error) {
            otterlogs.error(`Erreur lors du chargement de la commande ${file} : ${error}`);
        }
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: body });
    } catch (error) {
        otterlogs.error(`Erreur lors de l\'envoi des commandes à l\'API Discord : ${error}`);
    }
}
