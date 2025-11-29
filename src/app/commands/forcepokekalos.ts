
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { forcePostLatestArticle } from "../utils/articleScraper";

export default {
    data: new SlashCommandBuilder()
        .setName("forcepokekalos")
        .setDescription("Force le bot à poster le dernier article de Pokekalos"),
    execute: async (interaction: CommandInteraction) => {
        await interaction.deferReply({ ephemeral: true });
        try {
            await forcePostLatestArticle(interaction.client);
            await interaction.editReply("Dernier article posté avec succès !");
        } catch (error) {
            console.error(error);
            await interaction.editReply("Erreur lors du post de l'article.");
        }
    }
};
