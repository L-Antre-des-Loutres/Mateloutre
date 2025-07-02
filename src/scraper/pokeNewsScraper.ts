import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsArticle {
    title: string;
    link: string;
    date: string;
    description: string;
    image: string;
}

export async function fetchPokeNews(lastTitle: string): Promise<NewsArticle[]> {
    const url = 'https://www.pokekalos.fr';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Mateloutre/1.0)',
    };

    let $: cheerio.CheerioAPI;
    try {
        const response = await axios.get<string>(url, { headers });
        $ = cheerio.load(response.data);
    } catch (error) {
        console.error('Erreur lors du chargement de Pokekalos :', error);
        return [];
    }

    const articles: NewsArticle[] = [];

    $('.timeline-news').not('.news-event').each((_, el) => {
        const element = $(el);

        const title = element.find('.timeline-title').first().text().trim();
        if (!title || title === lastTitle) {
            // Stop the loop if we reach a known article
            return false; // ← arrête la boucle each()
        }

        const linkRel = element.find('a').first().attr('href');
        const link = linkRel ? new URL(linkRel, url).href : '';
        const date = element.find('time').first().text().trim();
        const description = element.find('.resume-news').first().text().trim();
        const img = element.find('img.lazyload').first();
        const imageRel = img.attr('data-src') || img.attr('src');
        const image = imageRel ? new URL(imageRel, url).href : '';

        if (title && link) {
            articles.push({ title, link, date, image, description });
        }
    });

    return articles;
}


