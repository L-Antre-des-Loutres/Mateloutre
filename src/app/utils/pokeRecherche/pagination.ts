import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable,
} from "discord.js";
import { PokemonData } from "../pokedle/gameLogic";
import { POKE_RECHERCHE_CONSTANTS, POKE_TAGS, PokeTag } from "./constants";

// Names are laid out in 3 columns
const COLUMNS = 3;

// Half of Discord's 4096-char embed description limit, used as the per-page budget.
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
 * Formats a Pokémon as "n°001 Nom".
 */
function formatCell(p: PokemonData, width: number): string {
    return `${DEX_PREFIX}${String(dexNumber(p)).padStart(width, "0")} ${p.name}`;
}

/**
 * Largest page size whose 3-column block stays under the description budget.
 * Deterministic for a given group, so the paginated button indices stay stable.
 */
function computePageSize(matches: PokemonData[]): number {
    if (matches.length === 0) return 1;
    const width = dexWidth(matches);
    const maxCellLen = Math.max(...matches.map(p => formatCell(p, width).length));
    const colWidth = maxCellLen + 2;
    const perRow = colWidth * COLUMNS + 1; // columns + newline
    const maxRows = Math.max(1, Math.floor(DESCRIPTION_BUDGET / perRow));
    return maxRows * COLUMNS;
}

/**
 * Returns the Pokémon of a group, sorted by dex number.
 */
export function getGroupMatches(pokemonList: PokemonData[], tag: string): PokemonData[] {
    return pokemonList
        .filter(p => (p.tags ?? []).includes(tag))
        .sort((a, b) => dexNumber(a) - dexNumber(b));
}

/**
 * Lays out cells in 3 aligned columns inside a monospace block.
 */
function formatColumns(cells: string[]): string {
    const colSize = Math.ceil(cells.length / 3);
    const columns = [
        cells.slice(0, colSize),
        cells.slice(colSize, colSize * 2),
        cells.slice(colSize * 2),
    ];
    const width = Math.max(...cells.map(c => c.length)) + 2;

    const lines: string[] = [];
    for (let row = 0; row < colSize; row++) {
        const rowCells = columns.map(col => (col[row] ?? "").padEnd(width, " "));
        lines.push(rowCells.join("").trimEnd());
    }
    return "```\n" + lines.join("\n") + "\n```";
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
    const width = dexWidth(matches);
    const cells = slice.map(p => formatCell(p, width));

    const description = `${formatColumns(cells)}\nPage ${current + 1}/${totalPages}`;

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
