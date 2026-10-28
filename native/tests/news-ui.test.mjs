import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

const generatedAt = '2026-10-27T12:00:00.000Z';
const item = {
  id: 'publisher-1',
  sourceId: 'paper',
  sourceName: 'El Diario',
  publisherGroup: 'diario',
  title: 'Familias buscan ayuda migratoria',
  url: 'https://example.org/news/immigration',
  language: 'es',
  publishedAt: '2026-10-26T09:30:00.000Z',
  datePrecision: 'instant',
  detectedAt: '2026-10-27T11:00:00.000Z',
  eventAt: null,
  areaId: null,
  freshness: 'within-publication-window',
  matchedOn: 'headline',
  reviewStatus: 'unreviewed',
  requiresReview: true,
  deliveryEligible: false,
  independentCorroboration: 'not-assessed',
};
const snapshot = (items = [item]) => ({
  version: 1,
  mode: 'published-news',
  generatedAt,
  sourceStatus: [
    {
      id: 'paper',
      name: 'El Diario',
      lastSuccessAt: generatedAt,
      lastAttemptAt: generatedAt,
      status: 'ok',
    },
  ],
  items,
});
const options = (extra = {}) => ({
  news: {
    fetch: async () => new Response(JSON.stringify(snapshot())),
    now: () => Date.parse(generatedAt),
    ...extra,
  },
});

test('community tabs show status only when their report feed is loading or failed', async () => {
  const p = page(options());
  try {
    await p.app.community.ready;
    const community = p.app.community;
    const status = p.doc.querySelector('#community-load-state');
    community.setTab('map');
    assert.equal(status.hidden, true, 'No empty amber status bar');
    community.error = true;
    community.setTab('reports');
    assert.equal(status.hidden, false);
    assert.ok(status.querySelector('[data-community-action="retry"]'));
    community.setTab('news');
    assert.equal(
      status.hidden,
      true,
      'Report errors stay out of the news view',
    );
    community.error = false;
    community.loading = true;
    community.setTab('map');
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /Loading/);
  } finally {
    p.close();
  }
});

test('actual product consumes publisher metadata without inventing incidents', async () => {
  const p = page(options());
  try {
    await p.app.community.news?.ready;
    p.app.navigate('alerts');
    const panel = p.doc.querySelector('[data-community-panel="news"]');
    assert.ok(panel, 'Community must expose the news consumer');
    assert.equal(panel.hidden, false);
    assert.equal(
      p.doc.querySelector('[data-community-panel="map"]').hidden,
      true,
    );
    const card = panel.querySelector('.news-card');
    assert.equal(card.querySelector('h3').textContent, item.title);
    assert.equal(card.querySelector('h3').lang, 'es');
    assert.match(card.textContent, /Published.*Oct 26/s);
    assert.match(card.textContent, /Detected.*Oct 27/s);
    assert.match(card.textContent, /Event time.*Not reported/s);
    assert.match(card.textContent, /News report.*Requires review/s);
    assert.equal(card.querySelector('a').href, item.url);
    assert.equal(card.querySelector('[data-community-report]'), null);
    assert.match(
      p.doc.querySelector('#home-community-reports').textContent,
      /Familias buscan/,
    );
    p.doc.querySelector('[data-community-tab="map"]').click();
    assert.equal(
      p.doc.querySelector('[data-community-panel="map"]').hidden,
      false,
    );
  } finally {
    p.close();
  }
});

test('language rebuild preserves news, filters, family draft and chat state', async () => {
  const p = page(options());
  try {
    await p.app.community.news?.ready;
    await p.app.community.ready;
    p.app.community.filters.query = 'Hialeah';
    p.app.community.following.add('miami-dade');
    await p.app.assistant.send('My question');
    const familyInput = p.doc.querySelector('#family-update-form textarea');
    familyInput.value = 'Keep family draft';
    const assistant = p.app.assistant,
      family = p.app.family;
    p.app.navigate('alerts');
    p.doc.querySelector('#product-language').click();
    await settle();
    await p.app.community.news?.ready;
    assert.equal(
      p.doc.querySelector('[data-community-panel="news"]')?.hidden,
      false,
    );
    assert.equal(p.doc.querySelector('#community-query').value, 'Hialeah');
    assert.equal(p.app.community.following.size, 1);
    assert.equal(p.app.assistant, assistant);
    assert.equal(p.app.family, family);
    assert.equal(
      p.doc.querySelector('#family-update-form textarea').value,
      'Keep family draft',
    );
    assert.match(
      p.doc.querySelector('#assistant-thread').textContent,
      /My question/,
    );
    const card = p.doc.querySelector('.news-card');
    assert.match(card.textContent, /Publicación/);
    assert.match(card.textContent, /No reportada/);
    assert.equal(card.querySelector('h3').textContent, item.title);
  } finally {
    p.close();
  }
});

test('unsafe links and malformed items cannot enter the DOM; title stays literal', async () => {
  const hostile = '<img src=x onerror=alert(1)> Immigration';
  const data = snapshot([
    { ...item, title: hostile },
    { ...item, id: 'bad', url: 'javascript:alert(1)' },
    { ...item, id: 'http', url: 'http://example.org' },
    { ...item, id: 'time', detectedAt: 'yesterday' },
    null,
  ]);
  const p = page(
    options({ fetch: async () => new Response(JSON.stringify(data)) }),
  );
  try {
    await p.app.community.news?.ready;
    const host = p.doc.querySelector('[data-community-panel="news"]');
    assert.ok(host, 'news panel exists');
    assert.equal(host.querySelectorAll('.news-card').length, 1);
    assert.equal(host.querySelector('h3').textContent, hostile);
    assert.equal(host.querySelector('img'), null);
    assert.equal(host.querySelector('a[href^="javascript:"]'), null);
    assert.match(host.textContent, /Some records were omitted/);
  } finally {
    p.close();
  }
});

test('offline snapshot shows age, source failure and retry then recovers to empty', async () => {
  let failing = true;
  const old = snapshot();
  old.sourceStatus[0].status = 'failed';
  const p = page(
    options({
      snapshot: old,
      now: () => Date.parse('2026-10-29T12:00:00Z'),
      fetch: async () => {
        if (failing) throw new Error('offline');
        return new Response(
          JSON.stringify({
            ...snapshot([]),
            generatedAt: '2026-10-29T12:00:00Z',
          }),
        );
      },
    }),
  );
  try {
    await p.app.community.news?.ready;
    const host = p.doc.querySelector('[data-community-panel="news"]');
    assert.ok(host, 'news panel exists');
    assert.match(host.textContent, /Showing saved stories/);
    assert.match(host.textContent, /Oct 27/);
    assert.match(host.textContent, /Newer stories may be missing/);
    assert.equal(host.querySelectorAll('.news-load-state p').length, 1);
    assert.doesNotMatch(
      host.querySelector('.news-load-state').textContent,
      /News could not load/,
    );
    assert.match(host.textContent, /El Diario.*Failed/s);
    failing = false;
    host.querySelector('[data-community-action="news-retry"]').click();
    await settle();
    await p.app.community.news.ready;
    assert.match(host.textContent, /No published news/);
    assert.doesNotMatch(host.textContent, /Showing saved stories/);
  } finally {
    p.close();
  }
});

test('invalid snapshot produces a retryable error rather than false empty success', async () => {
  const p = page(options({ fetch: async () => new Response('{"version":1}') }));
  try {
    await p.app.community.news?.ready;
    const host = p.doc.querySelector('[data-community-panel="news"]');
    assert.ok(host, 'news panel exists');
    assert.match(host.textContent, /News could not load/);
    assert.ok(host.querySelector('[data-community-action="news-retry"]'));
    assert.doesNotMatch(host.textContent, /No published news/);
  } finally {
    p.close();
  }
});
