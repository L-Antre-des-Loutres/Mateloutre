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
}

const articlesPath = path.join(__dirname, '../../data/articles.json');

export async function loadStoredArticles(): Promise<Article[]> {
    try {
        const raw = fs.readFileSync(articlesPath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export async function saveArticles(articles: Article[]): Promise<void> {
    fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2));
}

export async function scrapePokekalos(): Promise<Article[]> {
    try {
        const response = await axios.get('https://www.pokekalos.fr');
        const $ = load(response.data);
        const articles: Article[] = [];

        // À adapter selon la structure HTML réelle de Pokekalos
        $('article, .article-item').each((_, element) => {
            const title = $(element).find('h2, h3, .title').text().trim();
            const url = $(element).find('a').attr('href') || '';
            const date = $(element).find('.date, time').text().trim();
            const id = url.split('/').filter(Boolean).pop() || Date.now().toString();

            if (title && url) {
                articles.push({
                    id,
                    title,
                    url: url.startsWith('http') ? url : `https://www.pokekalos.fr${url}`,
                    date,
                    scrapedAt: Date.now()
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