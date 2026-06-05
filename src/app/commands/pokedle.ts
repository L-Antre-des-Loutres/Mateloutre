import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    AutocompleteInteraction,
    ColorResolvable,
    AttachmentBuilder
} from "discord.js";
import { SlashCommand } from "../../otterbots/types";
import { PokemonData } from "../utils/pokedle/gameLogic";
import { generatePokedleImage } from "../utils/pokedle/imageGenerator";
import { OtterCache } from "../../otterbots/utils/ottercache/ottercache";
import pokemonListRaw from "../data/pokemon.json";

const pokemonList = pokemonListRaw as PokemonData[];
const pokedleCache = new OtterCache<number[]>("pokedle.json");

export default {
    name: "pokedle",
    data: new SlashCommandBuilder()
        .setName("pokedle")
        .setDescription("Joue au Pokémon DLE quotidien !")
        .addSubcommand(sub =>
            sub.setName("deviner")
                .setDescription("Devine le Pokémon du jour")
                .addStringOption(opt =>
                    opt.setName("nom")
                        .setDescription("Le nom du Pokémon")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("stats")
                .setDescription("Affiche tes statistiques Pokedle")
        ) as SlashCommandBuilder,

    async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = pokemonList
            .filter(p => p.name.toLowerCase().includes(focusedValue))
            .slice(0, 25);
        
        await interaction.respond(
            choices.map(p => ({ name: p.name, value: p.name }))
        );
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${userId}_${today}`;

        // Pour la V1, le Pokémon du jour est fixe (Pikachu)
        const targetPokemon = pokemonList.find(p => p.id === 25)!;

        if (subcommand === "deviner") {
            const guessName = interaction.options.getString("nom", true);
            const guessPokemon = pokemonList.find(p => p.name.toLowerCase() === guessName.toLowerCase());

            if (!guessPokemon) {
                await interaction.reply({ content: "Ce Pokémon n'est pas dans ma liste !", ephemeral: true });
                return;
            }

            const attemptsIds = pokedleCache.get(cacheKey) || [];

            // Si déjà gagné, afficher le tableau de victoire et arrêter
            if (attemptsIds.includes(targetPokemon.id)) {
                const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
                const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
                const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, interaction.user.username);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'pokedle-result.png' });

                const embed = new EmbedBuilder()
                    .setTitle(`Pokémon DLE - ${today}`)
                    .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                    .setDescription(`Tu as déjà trouvé le Pokémon du jour (**${targetPokemon.name}**) ! Reviens demain pour un nouveau défi.`)
                    .setImage('attachment://pokedle-result.png')
                    .setFooter({ text: `Partie terminée en ${attemptsIds.length} essais` });

                await interaction.reply({ embeds: [embed], files: [attachment], ephemeral: true });
                return;
            }

            if (attemptsIds.includes(guessPokemon.id)) {
                await interaction.reply({ content: "Tu as déjà essayé ce Pokémon aujourd'hui !", ephemeral: true });
                return;
            }

            attemptsIds.push(guessPokemon.id);
            pokedleCache.set(cacheKey, attemptsIds);

            const isWin = guessPokemon.id === targetPokemon.id;
            
            // Génération de l'image
            const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
            const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
            const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, interaction.user.username);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'pokedle-result.png' });

            const embed = new EmbedBuilder()
                .setTitle(`Pokémon DLE - ${today}`)
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .setImage('attachment://pokedle-result.png')
                .setFooter({ text: `Essai ${attemptsIds.length} • 🟩 Bon • 🟨 Mal placé • 🟥 Mauvais • 🔼 Plus grand • 🔽 Plus petit` });

            if (isWin) {
                embed.addFields({ name: "Bravo !", value: `Tu as trouvé **${targetPokemon.name}** en ${attemptsIds.length} essais !` });
            }

            await interaction.reply({ embeds: [embed], files: [attachment] });
        } else if (subcommand === "stats") {
            await interaction.reply({ content: "Les statistiques arrivent bientôt !", ephemeral: true });
        }
    }
} as SlashCommand;
