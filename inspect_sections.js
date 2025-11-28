
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function inspect() {
    try {
        const response = await axios.get('https://www.pokekalos.fr/');
        const $ = cheerio.load(response.data);

        let output = '';
        const log = (msg) => { output += msg + '\n'; console.log(msg); };

        log('\n--- News Links Analysis ---');
        const links = $('a[href*="/news/"]');
        log(`Found ${links.length} links containing "/news/"`);

        let count = 0;
        links.each((i, el) => {
            if (count >= 10) return;

            const link = $(el);
            if (link.closest('nav, header, footer').length > 0) return;

            count++;
            log(`\nLink ${i}: ${link.attr('href')}`);
            let parent = link.parent();
            let depth = 0;
            while (parent.length > 0 && depth < 6) {
                const tag = parent.get(0).tagName;
                const cls = parent.attr('class') || '';
                const id = parent.attr('id') || '';
                log(`  Parent ${depth}: ${tag} class="${cls}" id="${id}"`);

                // Check for previous sibling header
                const prevHeader = parent.prevAll('h2, h3').first();
                if (prevHeader.length > 0) {
                    log(`    -> Preceded by header: ${prevHeader.text().trim()}`);
                }

                parent = parent.parent();
                depth++;
            }
        });

        fs.writeFileSync('sections_output.txt', output);

    } catch (error) {
        console.error(error);
    }
}

inspect();
