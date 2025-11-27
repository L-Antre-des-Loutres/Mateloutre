
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function inspect() {
    try {
        const response = await axios.get('https://www.pokekalos.fr/');
        const $ = cheerio.load(response.data);

        let output = '';
        const log = (msg) => { output += msg + '\n'; };

        log('Title: ' + $('title').text());

        // Try to find the news section
        const newsHeader = $('h2:contains("Les dernières actualités Pokémon")');
        log('News Header found: ' + (newsHeader.length > 0));

        if (newsHeader.length > 0) {
            const container = newsHeader.parent();
            log('Container class: ' + container.attr('class'));

            // Look for articles
            const articles = container.find('.news');
            log('Articles found (guessing .news): ' + articles.length);

            // List all classes of children of the container
            container.children().each((i, el) => {
                log(`Child ${i} tag: ${el.tagName}, class: ${$(el).attr('class')}`);
            });
        }

        // Try to find links that look like news
        $('a[href*="/news/"]').each((i, el) => {
            if (i < 5) {
                log(`News Link ${i}: ` + $(el).attr('href'));
                log(`  Parent class: ` + $(el).parent().attr('class'));
                log(`  Grandparent class: ` + $(el).parent().parent().attr('class'));
                // Log the structure around the link to find title and image
                log(`  Text: ` + $(el).text().trim());
                log(`  Image in link: ` + $(el).find('img').length);
                if ($(el).find('img').length > 0) {
                    log(`  Image src: ` + $(el).find('img').attr('src'));
                }
            }
        });

        fs.writeFileSync('inspect_result.txt', output);

    } catch (error) {
        console.error(error);
    }
}

inspect();
