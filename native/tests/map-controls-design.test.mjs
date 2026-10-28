import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

test('phone map filters remain on the map and preserve input across rotation', async () => {
  const p = page();
  try {
    Object.defineProperty(p.dom.window, 'innerWidth', {
      value: 390,
      configurable: true,
    });
    p.app.navigate('alerts');
    await p.app.community.ready;
    p.app.community.setTab('map');
    p.dom.window.dispatchEvent(new p.dom.window.Event('resize'));
    await settle();
    const query = p.doc.querySelector('#community-query');
    assert.ok(query.closest('.community-map-canvas'));
    assert.equal(query.closest('[data-mobile-sheet]'), null);
    query.value = 'Miami';
    query.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
    p.doc.querySelector('.community-feed .sheet-handle').click();
    assert.ok(query.closest('.community-map-canvas'));
    Object.defineProperty(p.dom.window, 'innerWidth', { value: 1440 });
    p.dom.window.dispatchEvent(new p.dom.window.Event('resize'));
    assert.equal(query.value, 'Miami');
    assert.equal(p.doc.querySelectorAll('#community-query').length, 1);
  } finally {
    p.close();
  }
});

test('network search and categories remain separate from the moving results', () => {
  const p = page();
  try {
    Object.defineProperty(p.dom.window, 'innerWidth', { value: 390 });
    p.app.navigate('network');
    p.dom.window.dispatchEvent(new p.dom.window.Event('resize'));
    const query = p.doc.querySelector('#network-search');
    assert.ok(query.closest('.network-canvas'));
    assert.equal(query.closest('[data-mobile-sheet]'), null);
    assert.ok(
      p.doc.querySelector('.network-canvas [data-network-filter="legal"]'),
    );
  } finally {
    p.close();
  }
});
