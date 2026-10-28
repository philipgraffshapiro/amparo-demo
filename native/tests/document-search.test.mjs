import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

for (const language of ['en', 'es']) {
  test(`${language}: a failed document search can be cleared without losing the category`, async () => {
    const p = page();
    try {
      if (language === 'es') p.doc.querySelector('#product-language').click();
      p.app.navigate('documents');
      const category = p.app.store.get().documents[0].category;
      p.doc.querySelector(`[data-doc-filter="${category}"]`).click();
      const expected = [
        ...p.doc.querySelectorAll('#document-rows [data-preview]'),
      ].map((node) => node.dataset.preview);
      const search = p.doc.querySelector('#document-search');
      search.value = 'zzz-no-documents';
      search.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
      assert.equal(
        p.doc.querySelectorAll('#document-rows [data-preview]').length,
        0,
      );
      assert.equal(
        p.doc.querySelector('#document-rows [data-dialog="upload"]'),
        null,
      );
      const clear = p.doc.querySelector(
        '#document-rows [data-action="clear-document-search"]',
      );
      assert.ok(clear, 'A search with no matches offers a clear-search action');
      clear.click();
      await settle();
      assert.equal(search.value, '');
      assert.equal(p.app.filters.documentQuery, '');
      assert.equal(p.app.filters.document, category);
      assert.equal(p.doc.activeElement, search);
      assert.deepEqual(
        [...p.doc.querySelectorAll('#document-rows [data-preview]')].map(
          (node) => node.dataset.preview,
        ),
        expected,
      );
    } finally {
      p.close();
    }
  });
}

test('a genuinely empty document collection still offers upload', () => {
  const p = page();
  try {
    for (const document of p.app.store.get().documents)
      p.app.store.removeDocument(document.id);
    p.app.navigate('documents');
    assert.ok(p.doc.querySelector('#document-rows [data-dialog="upload"]'));
    assert.equal(
      p.doc.querySelector(
        '#document-rows [data-action="clear-document-search"]',
      ),
      null,
    );
  } finally {
    p.close();
  }
});
