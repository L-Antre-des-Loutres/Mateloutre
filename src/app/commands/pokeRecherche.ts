
import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    AutocompleteInteraction,
    EmbedBuilder,
    ColorResolvable,
} from "discord.js";
import { SlashCommand } from "../../otterbots/types";
import { PapiService } from "../utils/papi/papiService";
import { PokemonData } from "../utils/pokedle/gameLogic";
import { POKE_RECHERCHE_CONSTANTS, POKE_TAGS } from "../utils/pokeRecherche/constants";
import { buildGroupPage, getGroupMatches } from "../utils/pokeRecherche/pagination";

/**
 * Autocomplete choices for the Pokémon name search.
 */
function pokemonChoices(focused: string): { name: string; value: string }[] {
    const pokemonList = PapiService.getCachedPokemonForPokedle();
    if (!pokemonList || pokemonList.length === 0) return [];

    let choices: PokemonData[];
    if (focused === "") {
        choices = pokemonList.slice(0, 25);
    } else {
        choices = pokemonList
            .filter(p => p.name.toLowerCase().includes(focused))
            .sort((a, b) => {
                const aStarts = a.name.toLowerCase().startsWith(focused);
                const bStarts = b.name.toLowerCase().startsWith(focused);

                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                return a.name.localeCompare(b.name);
            })
            .slice(0, 25);
    }

    return choices.map(p => ({ name: p.name, value: p.name }));
}

/**
 * Autocomplete choices for the group search, from the configurable tag table.
 */
function groupChoices(focused: string): { name: string; value: string }[] {
    return POKE_TAGS
        .filter(t => t.label.toLowerCase().includes(focused) || t.tag.toLowerCase().includes(focused))
        .slice(0, 25)
        .map(t => ({ name: t.label, value: t.tag }));
}

export default {
    name: POKE_RECHERCHE_CONSTANTS.COMMAND_NAME,
    data: new SlashCommandBuilder()
        .setName(POKE_RECHERCHE_CONSTANTS.COMMAND_NAME)
        .setDescription(POKE_RECHERCHE_CONSTANTS.COMMAND_DESCRIPTION)
        .addStringOption(opt =>
            opt.setName(POKE_RECHERCHE_CONSTANTS.OPTION_TYPE_NAME)
                .setDescription(POKE_RECHERCHE_CONSTANTS.OPTION_TYPE_DESCRIPTION)
                .setRequired(true)
                .addChoices(
                    { name: POKE_RECHERCHE_CONSTANTS.TYPE_POKEMON_LABEL, value: POKE_RECHERCHE_CONSTANTS.TYPE_POKEMON },
                    { name: POKE_RECHERCHE_CONSTANTS.TYPE_GROUP_LABEL, value: POKE_RECHERCHE_CONSTANTS.TYPE_GROUP },
                )
        )
        .addStringOption(opt =>
            opt.setName(POKE_RECHERCHE_CONSTANTS.OPTION_VALUE_NAME)
                .setDescription(POKE_RECHERCHE_CONSTANTS.OPTION_VALUE_DESCRIPTION)
                .setRequired(true)
                .setAutocomplete(true)
        ) as SlashCommandBuilder,

    async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        // The suggestions depend on the "type" option chosen just before
        const type = interaction.options.getString(POKE_RECHERCHE_CONSTANTS.OPTION_TYPE_NAME);
        const focused = interaction.options.getFocused().toLowerCase();

        if (type === POKE_RECHERCHE_CONSTANTS.TYPE_GROUP) {
            await interaction.respond(groupChoices(focused));
        } else if (type === POKE_RECHERCHE_CONSTANTS.TYPE_POKEMON) {
            await interaction.respond(pokemonChoices(focused));
        } else {
            // Type not chosen yet, nothing relevant to suggest
            await interaction.respond([]);
        }
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const type = interaction.options.getString(POKE_RECHERCHE_CONSTANTS.OPTION_TYPE_NAME, true);
        const value = interaction.options.getString(POKE_RECHERCHE_CONSTANTS.OPTION_VALUE_NAME, true);

        await interaction.deferReply();

        const pokemonList = await PapiService.getAllPokemonForPokedle();
        if (pokemonList.length === 0) {
            await interaction.editReply({ content: POKE_RECHERCHE_CONSTANTS.MSG_NO_DATA });
            return;
        }

        const color = (process.env.BOT_COLOR || "#f89800") as ColorResolvable;

        if (type === POKE_RECHERCHE_CONSTANTS.TYPE_POKEMON) {
            const pokemon = pokemonList.find(p => p.name.toLowerCase() === value.toLowerCase());

            if (!pokemon) {
                await interaction.editReply({ content: POKE_RECHERCHE_CONSTANTS.MSG_POKEMON_NOT_FOUND });
                return;
            }

            // For now the name search only returns the Pokémon name (issue #13)
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(pokemon.name);
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Group search by tag. Accept either the tag value or its label
        const tagConfig = POKE_TAGS.find(t => t.tag === value)
            || POKE_TAGS.find(t => t.label.toLowerCase() === value.toLowerCase());

        if (!tagConfig) {
            await interaction.editReply({ content: POKE_RECHERCHE_CONSTANTS.MSG_GROUP_NOT_FOUND });
            return;
        }

        const matches = getGroupMatches(pokemonList, tagConfig.tag);

        if (matches.length === 0) {
            await interaction.editReply({ content: POKE_RECHERCHE_CONSTANTS.MSG_GROUP_EMPTY.replace("{group}", tagConfig.label) });
            return;
        }

        const { embeds, components } = buildGroupPage(matches, tagConfig, 0, color);
        await interaction.editReply({ embeds, components });
    },
} as SlashCommand;
