import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import { notifyNewArticles } from './pokekalosNotifier';
import { Client } from 'discord.js';

export interface Article {
    id: string;
    title: string;
    url: string;
    date: string;
    scrapedAt: number;
    snippet: string;
    imageUrl: string;
}

const articlesPath = path.join(__dirname, '../data/articles.json');

export async function loadStoredArticles(): Promise<Article[]> {
    try {
        const raw = fs.readFileSync(articlesPath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export async function saveArticles(articles: Article[]): Promise<void> {
    const dir = path.dirname(articlesPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2));
}

export async function scrapePokekalos(): Promise<Article[]> {
    try {
        const response = await axios.get('https://www.pokekalos.fr');
        const $ = load(response.data);
        const articles: Article[] = [];

        // Target specifically the timeline section for "Les dernières actualités Pokémon"
        const timeline = $('#timeline');
        let newsItems = timeline.find('.timeline-news');

        // Fallback: if #timeline is not found, try to find the header and get the next container
        if (newsItems.length === 0) {
            const header = $('h2:contains("Les dernières actualités Pokémon")');
            const container = header.parent().find('#timeline');
            if (container.length > 0) {
                newsItems = container.find('.timeline-news');
            }
        }

        // If still 0, maybe the structure changed, try generic search BUT restricted to timeline if possible
        if (newsItems.length === 0) {
            // Try to find any container that looks like the timeline
            const potentialTimeline = $('.timeline-section').parent();
            if (potentialTimeline.length > 0) {
                newsItems = potentialTimeline.find('.timeline-news');
            }
        }

        // Last resort: generic search but try to avoid "contest" or "featured" classes if possible
        if (newsItems.length === 0) {
            console.warn('[Pokekalos] Timeline not found, using generic fallback.');
            const links = $('a[href*="/news/"]');
            const potentialArticles = new Set<any>();

            links.each((_, element) => {
                const link = $(element);
                const container = link.closest('div, article, li');
                // Exclude known "A la une" containers if possible (e.g. .contest)
                if (container.length > 0 && !container.hasClass('contest') && !container.parents('.contest').length) {
                    potentialArticles.add(container.get(0));
                }
            });

            newsItems = $(Array.from(potentialArticles));
        }

        newsItems.each((_, element) => {
            const el = $(element);

            // Title and Link
            // Try to find the most prominent link in the container
            let titleEl = el.find('h3 a, h4 a, .title a').first();
            if (titleEl.length === 0) {
                // If no header link, look for any link with significant text
                titleEl = el.find('a[href*="/news/"]').filter((_, a) => $(a).text().trim().length > 10).first();
            }

            let title = titleEl.text().trim();
            let url = titleEl.attr('href');

            if (!title || !url) return;

            if (!url.startsWith('http')) {
                url = 'https://www.pokekalos.fr' + url;
            }

            // Image
            let imageUrl = el.find('img').attr('src');
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https://www.pokekalos.fr' + imageUrl;
            }
            if (!imageUrl) imageUrl = '';

            // Snippet
            let snippet = el.find('p, .description, .content').text().trim();
            // If no p tag, try to get text from the container excluding the title
            if (!snippet) {
                const clone = el.clone();
                clone.find('h3, h4, .title, a').remove();
                snippet = clone.text().trim();
            }

            const words = snippet.split(/\s+/);
            if (words.length > 50) {
                snippet = words.slice(0, 50).join(' ') + '...';
            }

            // Date (optional, might not be easily parseable)
            const date = el.find('.date, time').text().trim() || new Date().toISOString();

            // ID
            const id = url;

            // Avoid duplicates in the current batch
            if (articles.some(a => a.id === id)) return;

            if (title && url) {
                articles.push({
                    id,
                    title,
                    url,
                    date,
                    scrapedAt: Date.now(),
                    snippet,
                    imageUrl
                });
            }
        });

        return articles;
    } catch (error) {
        console.error('Erreur lors du scraping de Pokekalos:', error);
        return [];
    }
}

export async function getNewArticles(client?: Client): Promise<Article[]> {
    const storedArticles = await loadStoredArticles();
    const newArticles = await scrapePokekalos();

    const storedIds = new Set(storedArticles.map(a => a.id));
    const freshArticles = newArticles.filter(a => !storedIds.has(a.id));

    if (freshArticles.length > 0) {
        const allArticles = [...freshArticles, ...storedArticles].slice(0, 50);
        await saveArticles(allArticles);

        if (client) {
            await notifyNewArticles(client, freshArticles);
        }
    }

    return freshArticles;
}

export async function forcePostLatestArticle(client: Client): Promise<void> {
    const articles = await scrapePokekalos();
    if (articles.length > 0) {
        // Post the very first one (latest)
        const latest = articles[0];
        await notifyNewArticles(client, [latest]);
    }
}