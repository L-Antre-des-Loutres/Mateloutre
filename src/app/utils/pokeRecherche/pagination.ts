import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable,
} from "discord.js";
import { PokemonData } from "../pokedle/gameLogic";
import { POKE_RECHERCHE_CONSTANTS, POKE_TAGS, PokeTag, getTypeEmoji } from "./constants";

// Per-page budget in characters, kept under Discord's 4096 embed description limit.
const DESCRIPTION_BUDGET = 4096 / 3 + 500;

// Prefix shown before every dex number, e.g. "n°001"
const DEX_PREFIX = "n°";

// customId format for the pagination buttons: poke-recherche|<tag>|<page>
const PAGINATION_ID_PREFIX = "poke-recherche";

/**
 * Returns the dex number (fallback to id), zero-padded to the given width.
 */
function dexNumber(p: PokemonData): number {
    return p.nationalDexNumber ?? p.id;
}

/**
 * Width used to zero-pad dex numbers, at least 3 digits ("001").
 */
function dexWidth(matches: PokemonData[]): number {
    const maxDex = Math.max(...matches.map(dexNumber));
    return Math.max(3, String(maxDex).length);
}

/**
 * Represents a Pokémon's types as emojis, e.g. "🌿☠️".
 */
function formatTypes(p: PokemonData): string {
    const first = getTypeEmoji(p.type1);
    return p.type2 ? `${first}${getTypeEmoji(p.type2)}` : first;
}

/**
 * Max name length in the group, used to align the type emojis.
 */
function nameWidth(matches: PokemonData[]): number {
    return Math.max(...matches.map(p => p.name.length));
}

/**
 * Formats a Pokémon as one line, e.g. "`n°001 Bulbizarre` 🌿☠️".
 * The dex and padded name sit in inline code (monospace), so the type
 * emojis line up in a column across rows.
 */
function formatLine(p: PokemonData, dexW: number, nameW: number): string {
    const dex = `${DEX_PREFIX}${String(dexNumber(p)).padStart(dexW, "0")}`;
    const label = `${dex} ${p.name.padEnd(nameW, " ")}`;
    return `\`${label}\` ${formatTypes(p)}`;
}

/**
 * Largest page size whose lines stay under the description budget.
 * Deterministic for a given group, so the paginated button indices stay stable.
 */
function computePageSize(matches: PokemonData[]): number {
    if (matches.length === 0) return 1;
    const dexW = dexWidth(matches);
    const nameW = nameWidth(matches);
    const maxLineLen = Math.max(...matches.map(p => formatLine(p, dexW, nameW).length));
    return Math.max(1, Math.floor(DESCRIPTION_BUDGET / (maxLineLen + 1)));
}

/**
 * Returns the Pokémon of a group, sorted by dex number.
 */
export function getGroupMatches(pokemonList: PokemonData[], tag: string): PokemonData[] {
    return pokemonList
        .filter(p => (p.tags ?? []).includes(tag))
        .sort((a, b) => dexNumber(a) - dexNumber(b));
}

export interface GroupPageMessage {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * Builds the embed and navigation buttons for one page of a group.
 * The page index is clamped so out-of-range values are safe.
 */
export function buildGroupPage(
    matches: PokemonData[],
    tagConfig: PokeTag,
    page: number,
    color: ColorResolvable,
): GroupPageMessage {
    const pageSize = computePageSize(matches);
    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    const current = Math.min(Math.max(page, 0), totalPages - 1);

    const slice = matches.slice(current * pageSize, current * pageSize + pageSize);
    const dexW = dexWidth(matches);
    const nameW = nameWidth(matches);
    const lines = slice.map(p => formatLine(p, dexW, nameW));

    const description = `${lines.join("\n")}\n\n📃 Page ${current + 1}/${totalPages}`;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(POKE_RECHERCHE_CONSTANTS.EMBED_GROUP_TITLE
            .replace("{group}", tagConfig.label)
            .replace("{count}", matches.length.toString()))
        .setDescription(description)
        .setFooter({ text: "Commande /poke-recherche" });

    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (totalPages > 1) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${PAGINATION_ID_PREFIX}|${tagConfig.tag}|${current - 1}`)
                .setLabel("◀ Précédent")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(current === 0),
            new ButtonBuilder()
                .setCustomId(`${PAGINATION_ID_PREFIX}|${tagConfig.tag}|${current + 1}`)
                .setLabel("Suivant ▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(current === totalPages - 1),
        );
        components.push(row);
    }

    return { embeds: [embed], components };
}

/**
 * Parses a pagination button customId, returning the group tag and page index.
 */
export function parsePaginationId(customId: string): { tag: string; page: number } | null {
    if (!customId.startsWith(`${PAGINATION_ID_PREFIX}|`)) return null;

    const parts = customId.split("|");
    if (parts.length !== 3) return null;

    const page = parseInt(parts[2], 10);
    if (Number.isNaN(page)) return null;

    return { tag: parts[1], page };
}

/**
 * Resolves a group tag to its configuration.
 */
export function findTagConfig(tag: string): PokeTag | undefined {
    return POKE_TAGS.find(t => t.tag === tag);
}
