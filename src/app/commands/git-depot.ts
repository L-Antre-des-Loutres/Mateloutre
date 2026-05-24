import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ColorResolvable } from 'discord.js';

export default {
    autocomplete: false,
    name: 'git-depot',
    data: new SlashCommandBuilder()
        .setName('git-depot')
        .setDescription('Renvoi le lien du dépôt GitHub de Mateloutre.'),

    execute: async (interaction: ChatInputCommandInteraction) => {
        // Récupération de BOT_COLOR et VERSION depuis .env
        const bot_color = process.env.BOT_COLOR || "#FFFFFF";
        const version = process.env.VERSION || "0.0.0";

        const embed = new EmbedBuilder()
            .setTitle("Dépôt GitHub de Mineotter")
            .setURL("https://github.com/L-Antre-des-Loutres/Mateloutre")
            .setDescription(`Et voilà pour toi le lien de mon magnifique dépôt GitHub !\nJe suis actuellement en version ${version}.`)
            .setImage("https://raw.githubusercontent.com/L-Antre-des-Loutres/Mateloutre/refs/heads/main/imgs/MateloutreLogo1.png")
            .setColor(bot_color as ColorResolvable)
            .setFooter({
                text: "Mineotter",
                iconURL: interaction.client.user?.displayAvatarURL() || '',
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
