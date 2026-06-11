import { createCanvas, loadImage, registerFont } from 'canvas';
import { PokemonData, comparePokemonV2, ComparisonResult } from './gameLogic';
import { POKEDLE_COLORS, POKEDLE_CONSTANTS, POKEDLE_EMOJIS } from './constants';
import axios from 'axios';
import path from 'path';

// Enregistrement de la police pour Linux/Docker
const fontPath = path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Bold.ttf');
registerFont(fontPath, { family: 'Roboto', weight: 'bold' });

const CELL_WIDTH = 120;
const CELL_HEIGHT = 60;
const NAME_WIDTH = 220;
const PADDING = 30;
const AVATAR_SIZE = 80;

const COLORS: Record<ComparisonResult | 'bg' | 'text' | 'border', string> = {
    exact: POKEDLE_COLORS.EXACT,
    partial: POKEDLE_COLORS.PARTIAL,
    wrong: POKEDLE_COLORS.WRONG,
    higher: POKEDLE_COLORS.WRONG,
    lower: POKEDLE_COLORS.WRONG,
    bg: POKEDLE_COLORS.BG,
    text: POKEDLE_COLORS.TEXT,
    border: POKEDLE_COLORS.BORDER
};

/**
 * Génère une image buffer représentant le tableau des essais.
 */
export async function generatePokedleImage(attempts: PokemonData[], target: PokemonData, avatarUrl?: string, username?: string): Promise<Buffer> {
    const rows = attempts.length;
    const headerHeight = 100;
    const width = NAME_WIDTH + (CELL_WIDTH * 5) + (PADDING * 2);
    const height = headerHeight + (CELL_HEIGHT * (rows + 1)) + (PADDING * 2);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Avatar and Title
    let titleX = PADDING;
    if (avatarUrl) {
        try {
            const response = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            const avatarImg = await loadImage(Buffer.from(response.data));
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(PADDING + AVATAR_SIZE / 2, PADDING + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, PADDING, PADDING, AVATAR_SIZE, AVATAR_SIZE);
            ctx.restore();
            
            titleX += AVATAR_SIZE + 20;
        } catch (error) {
            console.error("Erreur chargement avatar:", error);
        }
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 32px Roboto';
    ctx.textAlign = 'left';
    const title = username 
        ? POKEDLE_CONSTANTS.IMAGE_TITLE.replace("{username}", username)
        : POKEDLE_CONSTANTS.IMAGE_DEFAULT_TITLE;
    ctx.fillText(title, titleX, PADDING + AVATAR_SIZE / 2 + 10);

    // Header Table
    const headers = [
        POKEDLE_CONSTANTS.HEADER_POKEMON,
        POKEDLE_CONSTANTS.HEADER_TYPE1,
        POKEDLE_CONSTANTS.HEADER_TYPE2,
        POKEDLE_CONSTANTS.HEADER_GEN,
        POKEDLE_CONSTANTS.HEADER_HEIGHT,
        POKEDLE_CONSTANTS.HEADER_WEIGHT
    ];
    ctx.font = 'bold 20px Roboto';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';

    let xCursor = PADDING;
    const tableStartY = headerHeight + PADDING;
    headers.forEach((h, i) => {
        const w = i === 0 ? NAME_WIDTH : CELL_WIDTH;
        ctx.fillText(h, xCursor + w / 2, tableStartY + CELL_HEIGHT / 2 + 8);
        xCursor += w;
    });

    // Rows
    attempts.forEach((guess, rowIndex) => {
        const comp = comparePokemonV2(guess, target);
        const y = tableStartY + (CELL_HEIGHT * (rowIndex + 1));
        xCursor = PADDING;

        // Name
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'left';
        ctx.font = 'bold 18px Roboto';
        ctx.fillText(guess.name, xCursor + 15, y + CELL_HEIGHT / 2 + 7);
        xCursor += NAME_WIDTH;

        // Stats
        const stats: { val: string | number | null, res: ComparisonResult }[] = [
            { val: guess.type1, res: comp.type1 },
            { val: guess.type2, res: comp.type2 },
            { val: guess.generation, res: comp.generation },
            { val: guess.height, res: comp.height },
            { val: guess.weight, res: comp.weight }
        ];

        stats.forEach((s, i) => {
            ctx.fillStyle = COLORS[s.res];
            ctx.fillRect(xCursor + 3, y + 3, CELL_WIDTH - 6, CELL_HEIGHT - 6);

            ctx.fillStyle = COLORS.text;
            ctx.textAlign = 'center';
            
            if (s.res === "exact" || s.res === "partial" || s.res === "wrong") {
                ctx.font = '16px Roboto';
                ctx.fillText(s.val?.toString() || "-", xCursor + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 7);
            } else {
                const display = s.res === "higher" ? POKEDLE_EMOJIS.HIGHER : POKEDLE_EMOJIS.LOWER;
                ctx.font = '22px Roboto';
                ctx.fillText(display, xCursor + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 - 5);
                
                ctx.font = '14px Roboto';
                let valStr = s.val?.toString() || "-";
                if (s.val !== null) {
                    const headerName = headers[i + 1];
                    if (headerName === POKEDLE_CONSTANTS.HEADER_HEIGHT) valStr += POKEDLE_CONSTANTS.UNIT_HEIGHT;
                    if (headerName === POKEDLE_CONSTANTS.HEADER_WEIGHT) valStr += POKEDLE_CONSTANTS.UNIT_WEIGHT;
                }
                ctx.fillText(valStr, xCursor + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 15);
            }
            xCursor += CELL_WIDTH;
        });
    });

    return canvas.toBuffer();
}
