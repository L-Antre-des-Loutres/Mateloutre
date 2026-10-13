import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsArticle {
    title: string;
    link: string;
    date: string;
    description: string;
    image: string;
}

const POKEKALOS_URL = 'https://www.pokekalos.fr';

export function resolveNewsUrl(value: string | undefined): string {
    if (!value?.trim()) return '';
    try {
        const url = new URL(value.trim(), POKEKALOS_URL);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

export function parsePokeNews(html: string, lastTitle: string): NewsArticle[] {
    const $ = cheerio.load(html);
    const elements = $('.timeline-news').not('.news-event');
    if (!elements.length) {
        throw new Error('Pokekalos : aucune actualité reconnue dans la page reçue (structure modifiée ou accès refusé).');
    }
    const articles: NewsArticle[] = [];

    elements.each((_, el) => {
        const element = $(el);

        const title = element.find('.timeline-title').first().text().trim();
        if (!title) return;
        if (title === lastTitle.trim()) {
            // Stop the loop if we reach a known article
            return false;
        }

        const linkRel = element.find('a').first().attr('href');
        const link = resolveNewsUrl(linkRel);
        const time = element.find('time').first();
        const date = time.text().trim() || time.attr('datetime')?.trim() || '';
        const description = element.find('.resume-news').first().text().trim();
        // Pokekalos also serves regular images without the lazyload class.
        const thumbnail = element.find('.timeline-thumb img').first();
        const img = thumbnail.length ? thumbnail : element.find('img').first();
        const image = resolveNewsUrl(img.attr('data-src')) || resolveNewsUrl(img.attr('src'));

        if (title && link) {
            articles.push({ title, link, date, image, description });
        }
    });

    return articles;
}

export async function fetchPokeNews(lastTitle: string): Promise<NewsArticle[]> {
    let html: string;
    try {
        const response = await axios.get<string>(POKEKALOS_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Mateloutre/1.0)' },
            timeout: 15000,
        });
        html = response.data;
    } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const detail = status ? `HTTP ${status}` : error instanceof Error ? error.message : String(error);
        throw new Error(`Chargement de Pokekalos impossible : ${detail}`, { cause: error });
    }
    if (typeof html !== 'string') {
        throw new Error('Pokekalos : la réponse reçue n’est pas une page HTML.');
    }
    return parsePokeNews(html, lastTitle);
}
