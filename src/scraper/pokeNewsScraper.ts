import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsArticle {
    title: string;
    link: string;
    date: string;
    description: string;
    image: string;
}

export async function fetchPokeNews(): Promise<NewsArticle[]> {
    const url = 'https://www.pokekalos.fr';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Mateloutre/1.0; +https://github.com/L-Antre-des-Loutres/Mateloutre)',
    };

    let $: cheerio.CheerioAPI;

    try {
        const response = await axios.get<string>(url, { headers });
        $ = cheerio.load(response.data);
    } catch (error) {
        console.error('Error fetching Pokekalos news:', error);
        return [];
    }

    const articles: NewsArticle[] = [];

    try {
        // Cible uniquement le premier article
        const firstArticle = $('#timeline').first();
        const title = firstArticle.find('.timeline-title').first().text().trim();
        const linkRel = firstArticle.find('a').attr('href');
        const link = linkRel ? new URL(linkRel, url).href : '';
        const date = firstArticle.find('time').first().text().trim();
        const description = firstArticle.find('.resume-news').first().text().trim();

        // Récupère l’image depuis l'attribut `data-src` en priorité, sinon `src`
        const imgElement = firstArticle.find('img.lazyload').first();
        const imageRel = imgElement.attr('data-src') || imgElement.attr('src');
        const image = imageRel ? new URL(imageRel, url).href : '';

        if (title && link) {
            articles.push({ title, link, date, image, description});
        }
    } catch (error) {
        console.error('Error parsing Pokekalos news:', error);
        return [];
    }

    return articles;
}

