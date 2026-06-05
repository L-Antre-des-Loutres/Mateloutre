import { createCanvas, loadImage } from 'canvas';
import { PokemonData, comparePokemonV2, ComparisonResult } from './gameLogic';
import axios from 'axios';

const CELL_WIDTH = 80;
const CELL_HEIGHT = 40;
const NAME_WIDTH = 150;
const PADDING = 20;
const AVATAR_SIZE = 60;

const COLORS: Record<ComparisonResult | 'bg' | 'text' | 'border', string> = {
    exact: "#3ba55c",
    partial: "#faa61a",
    wrong: "#ed4245",
    higher: "#ed4245",
    lower: "#ed4245",
    bg: "#2f3136",
    text: "#ffffff",
    border: "#4f545c"
};

const EMOJIS = {
    higher: "🔼",
    lower: "🔽"
};

/**
 * Génère une image buffer représentant le tableau des essais.
 */
export async function generatePokedleImage(attempts: PokemonData[], target: PokemonData, avatarUrl?: string, username?: string): Promise<Buffer> {
    const rows = attempts.length;
    const headerHeight = 80; // Hauteur accrue pour l'avatar et le titre
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
            
            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(PADDING + AVATAR_SIZE / 2, PADDING + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, PADDING, PADDING, AVATAR_SIZE, AVATAR_SIZE);
            ctx.restore();
            
            titleX += AVATAR_SIZE + 15;
        } catch (error) {
            console.error("Erreur chargement avatar:", error);
        }
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(username ? `DLE de ${username}` : "Pokémon DLE", titleX, PADDING + AVATAR_SIZE / 2 + 8);

    // Header Table
    const headers = ["Pokémon", "Type 1", "Type 2", "Gen", "Taille", "Poids"];
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';

    let xCursor = PADDING;
    const tableStartY = headerHeight + PADDING;
    headers.forEach((h, i) => {
        const w = i === 0 ? NAME_WIDTH : CELL_WIDTH;
        ctx.fillText(h, xCursor + w / 2, tableStartY + CELL_HEIGHT / 2 + 5);
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
        ctx.font = '14px Arial';
        ctx.fillText(guess.name, xCursor + 10, y + CELL_HEIGHT / 2 + 5);
        xCursor += NAME_WIDTH;

        // Stats
        const stats: { val: string | number | null, res: ComparisonResult }[] = [
            { val: guess.type1, res: comp.type1 },
            { val: guess.type2, res: comp.type2 },
            { val: guess.generation, res: comp.generation },
            { val: guess.height, res: comp.height },
            { val: guess.weight, res: comp.weight }
        ];

        stats.forEach(s => {
            // Cell Background
            ctx.fillStyle = COLORS[s.res];
            
            ctx.fillRect(xCursor + 2, y + 2, CELL_WIDTH - 4, CELL_HEIGHT - 4);

            // Text/Icon
            ctx.fillStyle = COLORS.text;
            ctx.textAlign = 'center';
            let display = "";
            if (s.res === "higher") display = EMOJIS.higher;
            else if (s.res === "lower") display = EMOJIS.lower;
            else display = "✓"; 

            if (s.res === "exact" || s.res === "partial" || s.res === "wrong") {
                ctx.font = '12px Arial';
                ctx.fillText(s.val?.toString() || "-", xCursor + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 5);
            } else {
                // Pour Taille et Poids avec flèches
                ctx.font = '16px Arial';
                ctx.fillText(display, xCursor + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 - 2);
                
                ctx.font = '10px Arial';
                let valStr = s.val?.toString() || "-";
                if (s.val !== null) {
                    // Ajout des unités pour plus de clarté
                    if (headers[stats.indexOf(s) + 1] === "Taille") valStr += "m";
                    if (headers[stats.indexOf(s) + 1] === "Poids") valStr += "kg";
                }
                ctx.fillText(valStr, xCursor + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 12);
            }

            xCursor += CELL_WIDTH;
        });
    });

    return canvas.toBuffer();
}
