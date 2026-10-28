import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { renderNews } from '../public/news/views.js';
import { renderCommunityHome } from '../public/community/home.js';

const raw = JSON.parse(
  await readFile(new URL('../public/data/news.json', import.meta.url)),
);
const state = { data: raw, loading: false, error: false, fallback: false };
const doc = (html) => new JSDOM(html).window.document;

test('news gives readers the original headline, publication date and SVG source action', () => {
  const page = doc(
    renderNews(state, 'en', { now: Date.parse(raw.generatedAt) }),
  );
  const story = page.querySelector('.news-card');
  assert.equal(story.querySelector('h3').textContent, raw.items[0].title);
  assert.equal(story.querySelector('.news-source-link').href, raw.items[0].url);
  assert.ok(story.querySelector('.news-source-link svg'));
  assert.equal(
    story.querySelector('.news-card-source time').dateTime,
    raw.items[0].publishedAt.slice(0, 10),
  );
  assert.ok(story.querySelector('.news-photo img[src^="media/news/"]'));
});

test('technical timing and review metadata is retained inside closed native disclosures', () => {
  for (const language of ['en', 'es']) {
    const page = doc(renderNews(state, language));
    const story = page.querySelector('.news-card');
    const details = story.querySelector('details.news-provenance');
    assert.ok(details);
    assert.equal(details.open, false);
    assert.ok(
      details.querySelector(`time[datetime="${raw.items[0].detectedAt}"]`),
    );
    assert.match(
      details.textContent,
      language === 'es'
        ? /Fecha del evento.*No reportada/s
        : /Event time.*Not reported/s,
    );
    assert.equal(story.querySelector('dl').closest('details'), details);
    assert.equal(page.querySelectorAll('.news-feed-note').length, 1);
  }
});

test('unknown articles use typography without borrowing another story photo', () => {
  const page = doc(
    renderNews(
      {
        ...state,
        data: {
          ...raw,
          items: [
            {
              ...raw.items[0],
              id: 'unknown',
              url: 'https://example.org/unknown',
            },
          ],
        },
      },
      'en',
    ),
  );
  assert.equal(page.querySelector('img'), null);
  assert.ok(page.querySelector('.news-card-text-only'));
});

test('home presents news as a page section outside the decorative map stage', () => {
  const page = doc(renderCommunityHome({ language: 'en', name: 'Maria' }));
  const feed = page.querySelector('.community-home-feed');
  assert.ok(feed);
  assert.equal(feed.closest('.community-home-stage'), null);
  assert.equal(feed.querySelector('h2').textContent, 'In the news');
  assert.doesNotMatch(
    feed.textContent,
    /A little more informed|Original sources · Separate event timing/,
  );
});
