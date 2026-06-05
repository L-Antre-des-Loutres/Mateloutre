import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    AutocompleteInteraction,
    ColorResolvable,
    AttachmentBuilder,
    GuildMember
} from "discord.js";
import { SlashCommand } from "../../otterbots/types";
import { PokemonData } from "../utils/pokedle/gameLogic";
import { generatePokedleImage } from "../utils/pokedle/imageGenerator";
import { OtterCache } from "../../otterbots/utils/ottercache/ottercache";
import { POKEDLE_CONSTANTS } from "../utils/pokedle/constants";
import pokemonListRaw from "../data/pokemon.json";

const pokemonList = pokemonListRaw as PokemonData[];
const pokedleCache = new OtterCache<number[]>(POKEDLE_CONSTANTS.CACHE_FILE_NAME);

export default {
    name: POKEDLE_CONSTANTS.COMMAND_NAME,
    data: new SlashCommandBuilder()
        .setName(POKEDLE_CONSTANTS.COMMAND_NAME)
        .setDescription(POKEDLE_CONSTANTS.COMMAND_DESCRIPTION)
        .addSubcommand(sub =>
            sub.setName(POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_NAME)
                .setDescription(POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_DESCRIPTION)
                .addStringOption(opt =>
                    opt.setName(POKEDLE_CONSTANTS.OPTION_POKEMON_NAME)
                        .setDescription(POKEDLE_CONSTANTS.OPTION_POKEMON_DESCRIPTION)
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName(POKEDLE_CONSTANTS.SUBCOMMAND_VIEW_NAME)
                .setDescription(POKEDLE_CONSTANTS.SUBCOMMAND_VIEW_DESCRIPTION)
        )
        .addSubcommand(sub =>
            sub.setName(POKEDLE_CONSTANTS.SUBCOMMAND_STATS_NAME)
                .setDescription(POKEDLE_CONSTANTS.SUBCOMMAND_STATS_DESCRIPTION)
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
        const now = new Date();
        const todayISO = now.toISOString().split('T')[0];
        const todayFR = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const cacheKey = `${userId}_${todayISO}`;

        // Pour la V1, le Pokémon du jour est fixe (Pikachu)
        const targetPokemon = pokemonList.find(p => p.id === 25)!;
        const displayName = interaction.member instanceof GuildMember 
            ? interaction.member.displayName 
            : interaction.user.displayName;

        if (subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_NAME) {
            const guessName = interaction.options.getString(POKEDLE_CONSTANTS.OPTION_POKEMON_NAME, true);
            const guessPokemon = pokemonList.find(p => p.name.toLowerCase() === guessName.toLowerCase());

            if (!guessPokemon) {
                await interaction.reply({ content: POKEDLE_CONSTANTS.MSG_NOT_IN_LIST, ephemeral: true });
                return;
            }

            const attemptsIds = pokedleCache.get(cacheKey) || [];

            // Si déjà gagné, afficher le tableau de victoire et arrêter
            if (attemptsIds.includes(targetPokemon.id)) {
                const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
                const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
                const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, displayName);
                const attachment = new AttachmentBuilder(imageBuffer, { name: POKEDLE_CONSTANTS.RESULT_IMAGE_NAME });

                const embed = new EmbedBuilder()
                    .setTitle(POKEDLE_CONSTANTS.EMBED_TITLE.replace("{date}", todayFR))
                    .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                    .setDescription(POKEDLE_CONSTANTS.MSG_ALREADY_WON.replace("{target}", targetPokemon.name))
                    .setImage(`attachment://${POKEDLE_CONSTANTS.RESULT_IMAGE_NAME}`)
                    .setFooter({ text: POKEDLE_CONSTANTS.FOOTER_WON_TEXT.replace("{count}", attemptsIds.length.toString()) });

                await interaction.reply({ embeds: [embed], files: [attachment] });
                return;
            }

            if (attemptsIds.includes(guessPokemon.id)) {
                await interaction.reply({ content: POKEDLE_CONSTANTS.MSG_ALREADY_TRIED, ephemeral: true });
                return;
            }

            attemptsIds.push(guessPokemon.id);
            pokedleCache.set(cacheKey, attemptsIds);

            const isWin = guessPokemon.id === targetPokemon.id;
            
            // Génération de l'image
            const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
            const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
            const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, displayName);
            const attachment = new AttachmentBuilder(imageBuffer, { name: POKEDLE_CONSTANTS.RESULT_IMAGE_NAME });

            const embed = new EmbedBuilder()
                .setTitle(POKEDLE_CONSTANTS.EMBED_TITLE.replace("{date}", todayFR))
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .setImage(`attachment://${POKEDLE_CONSTANTS.RESULT_IMAGE_NAME}`)
                .setFooter({ 
                    text: POKEDLE_CONSTANTS.FOOTER_TEXT.replace("{count}", attemptsIds.length.toString()) 
                });

            if (isWin) {
                embed.addFields({ 
                    name: POKEDLE_CONSTANTS.MSG_WIN_TITLE, 
                    value: POKEDLE_CONSTANTS.MSG_WIN_CONTENT
                        .replace("{target}", targetPokemon.name)
                        .replace("{attempts}", attemptsIds.length.toString()) 
                });
            }

            // Éphémère si pas encore gagné
            await interaction.reply({ embeds: [embed], files: [attachment], ephemeral: !isWin });

        } else if (subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_VIEW_NAME) {
            const attemptsIds = pokedleCache.get(cacheKey) || [];
            if (attemptsIds.length === 0) {
                await interaction.reply({ content: "Tu n'as pas encore commencé ta partie d'aujourd'hui !", ephemeral: true });
                return;
            }

            const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
            const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
            const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, displayName);
            const attachment = new AttachmentBuilder(imageBuffer, { name: POKEDLE_CONSTANTS.RESULT_IMAGE_NAME });

            const isWon = attemptsIds.includes(targetPokemon.id);

            const embed = new EmbedBuilder()
                .setTitle(POKEDLE_CONSTANTS.EMBED_TITLE.replace("{date}", todayFR))
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .setImage(`attachment://${POKEDLE_CONSTANTS.RESULT_IMAGE_NAME}`)
                .setFooter({ 
                    text: isWon 
                        ? POKEDLE_CONSTANTS.FOOTER_WON_TEXT.replace("{count}", attemptsIds.length.toString())
                        : POKEDLE_CONSTANTS.FOOTER_TEXT.replace("{count}", attemptsIds.length.toString()) 
                });

            if (isWon) {
                embed.setDescription(`Partie terminée ! Le Pokémon était **${targetPokemon.name}**.`);
            }

            await interaction.reply({ embeds: [embed], files: [attachment] });

        } else if (subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_STATS_NAME) {
            await interaction.reply({ content: POKEDLE_CONSTANTS.MSG_STATS_COMING, ephemeral: true });
        }
    }
} as SlashCommand;
