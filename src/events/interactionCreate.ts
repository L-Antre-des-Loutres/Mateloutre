import { ColorResolvable, Events, Interaction } from "discord.js";
import { BotEvent } from "../types";
import otterlogs from "../utils/otterlogs";

const event: BotEvent = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction) {
        try {
            // Gère les commandes slash
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.slashCommands.get(interaction.commandName);
                if (!command || !command.execute) {
                    otterlogs.warn(`Commande nommée "${interaction.commandName}" exécutée par ${interaction.user.tag} (ID: ${interaction.user.id}), mais la commande n'existe pas ou plus. Les commandes sont-elles à jour ?`);
                    return interaction.reply({ content: "Cette commande n'existe pas ou plus ! ", ephemeral: true });
                }
                await command.execute(interaction);
            }
        } catch (error) {
            otterlogs.error("Erreur lors de l'exécution de l'interaction:");
            if (interaction.isChatInputCommand()) {
                interaction.reply({ content: "Une erreur est survenue lors de l'exécution de la commande.", ephemeral: true });
            }
        }
    }
}

export default event;
