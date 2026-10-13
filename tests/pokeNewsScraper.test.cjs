const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { fetchPokeNews, parsePokeNews } = require('../build/app/scraper/pokeNewsScraper.js');
const { createPokeNewsEmbed } = require('../build/app/scraper/pokeNewsEmbed.js');

// Public home-page markup captured on 2026-10-13; no network or Discord sends in tests.
const html = readFileSync(path.join(__dirname, 'fixtures/pokekalos-news.html'), 'utf8');
const news = parsePokeNews(html, '');

test('current Pokekalos images without lazyload reproduce the old failure and produce valid embeds', () => {
    assert.equal(news.length, 3);
    assert.equal(news[0].title, 'Pokémon GO : Community Day de Zorua le 10 octobre 2026');
    assert.equal(news[0].image, 'https://www.media.pokekalos.fr/uploads/2026/08/21/35bba4947a60c081d0e963a803c70b89.th.jpg');
    assert.equal(news[0].date, '10/10/2026 à 08h35');
    assert.match(news[0].link, /^https:\/\/www\.pokekalos\.fr\/news\//);
    assert.throws(() => new EmbedBuilder().setImage(''), /Received one or more errors/);
    for (const article of news) {
        const embed = createPokeNewsEmbed(article).toJSON();
        assert.equal(embed.image.url, article.image);
        assert.equal(embed.url, article.link);
    }
});

test('known title stops traversal and preserves newest-to-oldest order', () => {
    assert.deepEqual(parsePokeNews(html, ` ${news[1].title}\n`), [news[0]]);
    assert.deepEqual(parsePokeNews(html, news[0].title), []);
});

test('events and malformed entries do not hide subsequent valid news; lazy images and relative URLs still work', () => {
    const articles = parsePokeNews(`
        <div class="timeline-news news-event"><a href="/event"><div class="timeline-title">Évènement</div></a></div>
        <div class="timeline-news"><a href="/empty">Sans titre</a></div>
        <div class="timeline-news"><a href="javascript:alert(1)"><div class="timeline-title">Lien invalide</div></a></div>
        <div class="timeline-news"><a href="/news/test.html"><div class="timeline-title">Article</div></a>
            <time datetime="2026-10-13"></time><p class="resume-news">Résumé</p>
            <img class="lazyload" data-src="/images/test.jpg" src="data:image/gif;base64,AA==">
        </div>`, '');
    assert.equal(articles.length, 1);
    assert.equal(articles[0].image, 'https://www.pokekalos.fr/images/test.jpg');
    assert.equal(articles[0].date, '2026-10-13');
});

test('missing or invalid images, date and avatar are omitted from the Discord embed', () => {
    for (const image of ['', 'data:image/png;base64,AA==', 'https://[invalid]']) {
        const embed = createPokeNewsEmbed({ ...news[0], image, date: '' }, { avatarURL: '' }).toJSON();
        assert.equal(embed.image, undefined);
        assert.equal(embed.footer.icon_url, undefined);
        assert.deepEqual(embed.fields, [{ name: 'Source', value: 'Pokekalos', inline: true }]);
    }
    const article = parsePokeNews('<div class="timeline-news"><a href="/news/no-image"><div class="timeline-title">Sans image</div></a></div>', '')[0];
    assert.doesNotThrow(() => createPokeNewsEmbed(article).toJSON());
});

test('oversized scraped text respects individual and total Discord limits', () => {
    const embed = createPokeNewsEmbed({ ...news[0], title: 'T'.repeat(300), description: 'D'.repeat(8000), date: 'J'.repeat(2000) }, { botName: 'B'.repeat(3000) }).toJSON();
    assert.equal(embed.title.length, 256);
    assert.ok(embed.description.length <= 4096);
    assert.ok(embed.description.endsWith(`🔗 [Lire l'article](${news[0].link})`));
    const total = embed.title.length + embed.description.length + embed.footer.text.length + embed.fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0);
    assert.ok(total <= 6000);
});

test('unexpected HTML fails explicitly instead of reporting no new articles', () => {
    assert.throws(() => parsePokeNews('<html><title>Access denied</title></html>', ''), /aucune actualité reconnue/);
});

test('fetch uses a timeout, returns parsed news and propagates HTTP denial and network errors without retry', async () => {
    const get = axios.get;
    try {
        let calls = 0;
        axios.get = async (url, options) => {
            calls++;
            assert.equal(url, 'https://www.pokekalos.fr');
            assert.equal(options.timeout, 15000);
            return { data: html };
        };
        assert.deepEqual(await fetchPokeNews(news[1].title), [news[0]]);
        assert.equal(calls, 1);

        for (const status of [403, 429, 500]) {
            calls = 0;
            const error = new axios.AxiosError(`Request failed with status code ${status}`);
            error.response = { status };
            axios.get = async () => { calls++; throw error; };
            await assert.rejects(fetchPokeNews(''), new RegExp(`HTTP ${status}`));
            assert.equal(calls, 1);
        }
        axios.get = async () => { throw new Error('timeout of 15000ms exceeded'); };
        await assert.rejects(fetchPokeNews(''), /timeout of 15000ms exceeded/);
        axios.get = async () => ({ data: { error: 'unexpected JSON' } });
        await assert.rejects(fetchPokeNews(''), /pas une page HTML/);
    } finally {
        axios.get = get;
    }
});
