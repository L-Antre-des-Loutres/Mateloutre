import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ColorResolvable,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { SlashCommand } from "../../otterbots/types";
import { otterlogs } from "../../otterbots/utils/otterlogs";
import { PapiService } from "../utils/papi/papiService";
import { POKEMON_GROUPS } from "../utils/recherche-poke/pokemonGroups";
import {
    FicheMove,
    getPokemonFiche,
    PokemonFiche,
    searchByTag,
} from "../utils/recherche-poke/rechercheService";
import { MoveLearnMethod, PkmnSummaryResponse } from "../utils/papi/types/pokemon";

const COMMAND_NAME = "recherche-poke";
const OPTION_TYPE = "type";
const OPTION_SEARCH = "recherche";
const TYPE_POKEMON = "pokemon";
const TYPE_GROUP = "groupe";
const AUTOCOMPLETE_LIMIT = 25;
const FIELD_LIMIT = 1024;
const DESCRIPTION_LIMIT = 3900;

const METHOD_LABEL: Record<MoveLearnMethod, string> = {
    LEVEL_UP: "Niv.",
    MACHINE: "CT/CS",
    EGG: "Œuf",
    TUTOR: "Tuteur",
};

export default {
    name: COMMAND_NAME,
    data: new SlashCommandBuilder()
        .setName(COMMAND_NAME)
        .setDescription("Affiche les infos d'un Pokémon ou d'un groupe de Pokémon")
        .addStringOption(opt =>
            opt.setName(OPTION_TYPE)
                .setDescription("Rechercher un Pokémon précis ou un groupe")
                .setRequired(true)
                .addChoices(
                    { name: "Pokémon", value: TYPE_POKEMON },
                    { name: "Groupe", value: TYPE_GROUP },
                )
        )
        .addStringOption(opt =>
            opt.setName(OPTION_SEARCH)
                .setDescription("Le Pokémon ou le groupe recherché")
                .setRequired(true)
                .setAutocomplete(true)
        ) as SlashCommandBuilder,

    async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const focused = interaction.options.getFocused(true);
        if (focused.name !== OPTION_SEARCH) {
            await interaction.respond([]);
            return;
        }

        const type = interaction.options.getString(OPTION_TYPE);
        const query = focused.value.toLowerCase();

        if (type === TYPE_GROUP) {
            const choices = POKEMON_GROUPS
                .filter(g => g.label.toLowerCase().includes(query))
                .slice(0, AUTOCOMPLETE_LIMIT)
                .map(g => ({ name: g.label, value: g.tag }));
            await interaction.respond(choices);
            return;
        }

        const pokemonList = await PapiService.getAllPokemonForPokedle();
        const matches = (query === ""
            ? pokemonList
            : pokemonList.filter(p => p.name.toLowerCase().includes(query)))
            .slice(0, AUTOCOMPLETE_LIMIT)
            .map(p => ({ name: p.name, value: String(p.id) }));
        await interaction.respond(matches);
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const type = interaction.options.getString(OPTION_TYPE, true);
        const search = interaction.options.getString(OPTION_SEARCH, true);

        await interaction.deferReply();

        if (type === TYPE_GROUP) {
            await handleGroup(interaction, search);
        } else {
            await handlePokemon(interaction, search);
        }
    },
} as SlashCommand;

async function handlePokemon(interaction: ChatInputCommandInteraction, search: string): Promise<void> {
    const id = await resolvePokemonId(search);
    if (id === null) {
        await interaction.editReply({ content: `Aucun Pokémon trouvé pour « ${search} ».` });
        return;
    }

    try {
        const fiche = await getPokemonFiche(id);
        await interaction.editReply({ embeds: [buildFicheEmbed(fiche)] });
    } catch (error) {
        otterlogs.error(`recherche-poke: échec de la fiche du Pokémon ${id}: ${error}`);
        await interaction.editReply({ content: "Impossible de récupérer les infos de ce Pokémon pour le moment." });
    }
}

async function handleGroup(interaction: ChatInputCommandInteraction, search: string): Promise<void> {
    const group = POKEMON_GROUPS.find(
        g => g.tag.toLowerCase() === search.toLowerCase() || g.label.toLowerCase() === search.toLowerCase()
    );
    const tag = group?.tag ?? search;
    const label = group?.label ?? search;

    try {
        const [results, nameMap] = await Promise.all([
            searchByTag(tag),
            PapiService.getPokemonNameMap(),
        ]);

        if (results.length === 0) {
            await interaction.editReply({ content: `Aucun Pokémon trouvé pour le groupe « ${label} ».` });
            return;
        }

        await interaction.editReply({ embeds: [buildGroupEmbed(label, results, nameMap)] });
    } catch (error) {
        otterlogs.error(`recherche-poke: échec de la recherche par tag "${tag}": ${error}`);
        await interaction.editReply({ content: "Impossible de récupérer ce groupe de Pokémon pour le moment." });
    }
}

async function resolvePokemonId(search: string): Promise<number | null> {
    const parsed = Number(search);
    if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
    }
    const nameMap = await PapiService.getPokemonNameMap();
    for (const [id, name] of nameMap) {
        if (name.toLowerCase() === search.toLowerCase()) {
            return id;
        }
    }
    return null;
}

function buildFicheEmbed(fiche: PokemonFiche): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`#${String(fiche.dex).padStart(3, "0")} ${fiche.name}`)
        .setColor(resolveColor(fiche.color))
        .setThumbnail(fiche.spriteUrl);

    if (fiche.description) {
        embed.setDescription(truncate(fiche.description, 500));
    }

    const abilities = fiche.abilities.length > 0
        ? fiche.abilities.map(a => (a.hidden ? `${a.name} (caché)` : a.name)).join("\n")
        : "—";

    const stats = [
        `PV : ${fiche.stats.hp}`,
        `Attaque : ${fiche.stats.atk}`,
        `Défense : ${fiche.stats.def}`,
        `Att. Spé : ${fiche.stats.spa}`,
        `Déf. Spé : ${fiche.stats.spd}`,
        `Vitesse : ${fiche.stats.spe}`,
        `**Total : ${fiche.stats.total}**`,
    ].join("\n");

    embed.addFields(
        { name: "Types", value: fiche.types.length > 0 ? fiche.types.join(" / ") : "—", inline: true },
        { name: "Talents", value: abilities, inline: true },
        { name: "Taille / Poids", value: `${(fiche.heightCm / 100).toFixed(2)} m / ${fiche.weightKg} kg`, inline: true },
        { name: "Statistiques", value: stats, inline: false },
    );

    if (fiche.tags.length > 0) {
        embed.addFields({ name: "Tags", value: fiche.tags.join(", "), inline: false });
    }

    embed.addFields({
        name: `Movepool (${fiche.totalMoves})`,
        value: formatMovepool(fiche.moves, fiche.totalMoves),
        inline: false,
    });

    return embed;
}

function buildGroupEmbed(
    label: string,
    results: PkmnSummaryResponse[],
    nameMap: Map<number, string>,
): EmbedBuilder {
    const lines = [...results]
        .sort((a, b) => a.nationalDexNumber - b.nationalDexNumber)
        .map(p => `#${String(p.nationalDexNumber).padStart(3, "0")} ${nameMap.get(p.id) ?? p.symbol}`);

    let description = "";
    let shown = 0;
    for (const line of lines) {
        if (description.length + line.length + 1 > DESCRIPTION_LIMIT) break;
        description += (description ? "\n" : "") + line;
        shown++;
    }
    if (shown < lines.length) {
        description += `\n… et ${lines.length - shown} autres`;
    }

    return new EmbedBuilder()
        .setTitle(`${label} — ${results.length} Pokémon`)
        .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
        .setDescription(description);
}

function formatMovepool(moves: FicheMove[], total: number): string {
    if (moves.length === 0) {
        return "Aucune capacité connue.";
    }

    const lines = moves.map(m =>
        m.method === "LEVEL_UP" && m.level !== null
            ? `Niv. ${m.level} — ${m.name}`
            : `${m.name} (${METHOD_LABEL[m.method]})`
    );

    let value = "";
    let shown = 0;
    for (const line of lines) {
        if (value.length + line.length + 1 > FIELD_LIMIT - 20) break;
        value += (value ? "\n" : "") + line;
        shown++;
    }
    const remaining = total - shown;
    if (remaining > 0) {
        value += `\n… et ${remaining} autres`;
    }
    return value;
}

function resolveColor(color: string | null): ColorResolvable {
    if (color && /^#?[0-9a-fA-F]{6}$/.test(color)) {
        return (color.startsWith("#") ? color : `#${color}`) as ColorResolvable;
    }
    return (process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable;
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
