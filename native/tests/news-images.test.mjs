import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { parseSnapshot } from '../public/news/model.js';
import { renderNews } from '../public/news/views.js';
import { page } from './page-fixture.mjs';

const source = JSON.parse(await readFile('public/data/news.json', 'utf8'));
const image = {
  url: 'https://documentedny.com/wp-content/uploads/new-story.jpg',
  reuseStatus: 'permission-required',
  alt: 'People outside a community center',
  credit: 'Publisher photographer',
  provenance: 'rss-content-image',
};
const story = {
  ...source.items[0],
  id: 'new-photo-story',
  sourceId: 'documented',
  sourceName: 'Documented',
  url: 'https://documentedny.com/new-photo-story/',
  media: [image],
};
const snapshot = (media = [image]) => ({
  ...source,
  items: [
    { ...story, media },
    { ...story, id: 'without-photo', media: [] },
  ],
});

test('a newly collected story image reaches both languages without a static URL mapping', () => {
  const data = parseSnapshot(snapshot());
  assert.deepEqual(
    data.items.map((item) => item.id),
    ['new-photo-story', 'without-photo'],
  );
  for (const language of ['en', 'es']) {
    const dom = new JSDOM(renderNews({ data }, language));
    try {
      const cards = dom.window.document.querySelectorAll('.news-card');
      const photo = cards[0].querySelector('img');
      assert.equal(photo?.src, image.url);
      assert.equal(photo.alt, image.alt);
      assert.equal(photo.getAttribute('referrerpolicy'), 'no-referrer');
      assert.equal(cards[1].querySelector('img'), null);
      assert.equal(cards[0].querySelector('h3').textContent, story.title);
      assert.match(
        cards[0].querySelector('.news-photo-credit').textContent,
        /Publisher photographer/,
      );
    } finally {
      dom.window.close();
    }
  }
});

test('hostile image metadata removes only the image, preserving the story and dates', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:image/svg+xml,test',
    'http://documentedny.com/image.jpg',
    'https://documentedny.com.evil.test/image.jpg',
    'https://documentedny.com@evil.test/image.jpg',
    'https://user:secret@documentedny.com/image.jpg',
    'https://documentedny.com:444/image.jpg',
    'https://127.0.0.1/private.jpg',
    'https://media.telemundo51.com/wrong-source.jpg',
  ]) {
    const data = parseSnapshot(snapshot([{ ...image, url }]));
    assert.equal(data.items.length, 2);
    assert.equal(data.items[0].publishedAt, story.publishedAt);
    assert.deepEqual(data.items[0].media, []);
  }
  for (const media of [null, 'invalid', {}, [null, 1, 'text']]) {
    assert.deepEqual(parseSnapshot(snapshot(media)).items[0].media, []);
  }
});

test('image text stays literal and invalid entries do not hide a later valid image', () => {
  const text = '<img src=x onerror=alert(1)>';
  const data = parseSnapshot(
    snapshot([null, { ...image, alt: text, credit: text }]),
  );
  const dom = new JSDOM(renderNews({ data }, 'en'));
  try {
    assert.equal(dom.window.document.querySelectorAll('img').length, 1);
    assert.equal(dom.window.document.querySelector('img').alt, text);
    assert.equal(dom.window.document.querySelector('[onerror]'), null);
  } finally {
    dom.window.close();
  }
});

test('photo reuse and provenance must satisfy the contract before rendering', () => {
  for (const media of [
    { url: image.url },
    { ...image, reuseStatus: 'do-not-reuse', provenance: 25 },
    { ...image, provenance: 'invented' },
    { ...image, provenance: '' },
  ]) {
    const invalid = parseSnapshot(snapshot([media]));
    assert.equal(invalid.items.length, 2);
    assert.deepEqual(invalid.items[0].media, []);
    const laterValid = parseSnapshot(snapshot([media, image]));
    assert.equal(laterValid.items[0].media.length, 1);
    assert.equal(laterValid.items[0].media[0].url, image.url);
  }
});

test('failed image loading leaves a readable story without a broken photo slot', async () => {
  const p = page({
    news: { fetch: async () => new Response(JSON.stringify(snapshot())) },
  });
  try {
    await p.app.community.news.ready;
    const card = p.doc.querySelector('#home-community-reports .news-card');
    const photo = card.querySelector('img');
    assert.ok(photo);
    photo.dispatchEvent(new p.dom.window.Event('error'));
    assert.equal(card.querySelector('.news-photo'), null);
    assert.ok(card.classList.contains('news-card-text-only'));
    assert.equal(card.querySelector('h3').textContent, story.title);
    assert.equal(card.querySelector('.news-source-link').href, story.url);
  } finally {
    p.close();
  }
});
