import { SlashCommandBuilder, EmbedBuilder, CommandInteraction, Client, ColorResolvable } from 'discord.js';
import { SlashCommand } from '../types';

export const command: SlashCommand =  {
    name: 'git-depot',
    data: new SlashCommandBuilder()
        .setName('git-depot')
        .setDescription('Renvoi le lien du dépôt GitHub de Mateloutre.'),

    execute: async (interaction: CommandInteraction) => {
        // Récupération de BOT_COLOR et VERSION depuis .env
        let bot_color: string;
        let version: string;
        bot_color = process.env.BOT_COLOR || "#FFFFFF";
        version = process.env.VERSION || "0.0.0";

        const embed = new EmbedBuilder()
            .setTitle("Dépôt GitHub de Mineotter")
            .setURL("https://github.com/L-Antre-des-Loutres/Mateloutre")
            .setDescription(`Et voilà pour toi le lien de mon magnifique dépôt GitHub !\nJe suis actuellement en version ${version}.`)
            .setImage("https://perdu.com")
            .setColor(bot_color as ColorResolvable)
            .setFooter({
                text: "Mineotter",
                iconURL: interaction.client.user?.displayAvatarURL() || '',
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
