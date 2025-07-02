import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsArticle {
    title: string;
    link: string;
    date: string;
    description: string;
    image: string;
}

export async function fetchPokeNews(latestTitle?: string ): Promise<NewsArticle[]> {
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
        // Cible tous les articles de la timeline, sauf ceux marqués comme "event"
        const allArticles = $('.timeline-news').not('.news-event');

        for (const el of allArticles.toArray()) {
            const article = $(el);

            const title = article.find('.timeline-title').first().text().trim();

            // Si on atteint l'article déjà connu, on s'arrête
            if (latestTitle && title === latestTitle) break;

            const linkRel = article.find('a').first().attr('href');
            const link = linkRel ? new URL(linkRel, url).href : '';
            const date = article.find('time').first().text().trim();
            const description = article.find('.resume-news').first().text().trim();

            // Récupère l’image depuis `data-src` en priorité, sinon `src`
            const imgElement = article.find('img.lazyload').first();
            const imageRel = imgElement.attr('data-src') || imgElement.attr('src');
            const image = imageRel ? new URL(imageRel, url).href : '';

            if (title && link) {
                articles.push({ title, link, date, image, description });
            }
        }
    } catch (error) {
        console.error('Error parsing Pokekalos news:', error);
        return [];
    }

    return articles;
}

