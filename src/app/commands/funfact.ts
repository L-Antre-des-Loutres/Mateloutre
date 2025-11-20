import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder } from 'discord.js';
import facts from '../data/facts.json';


export default {
    data: new SlashCommandBuilder()
        .setName('fun-fact')
        .setDescription('Envoie une information aléatoire sur Pokémon.'),
    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const fact = facts[Math.floor(Math.random() * facts.length)];
        await interaction.reply({ content: fact });
    }
};