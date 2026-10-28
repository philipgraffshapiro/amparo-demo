import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

test('Spanish keeps the active screen, translates controls, and preserves membership', () => {
  const p = page();
  p.app.store.activateMembership();
  p.app.navigate('membership');
  p.doc.querySelector('#product-language').click();
  assert.equal(p.doc.documentElement.lang, 'es');
  assert.equal(
    p.doc.querySelector('[data-screen]:not([hidden])').dataset.screen,
    'membership',
  );
  assert.equal(
    p.doc.querySelector('#membership-label').textContent,
    'DEMO ACTIVA',
  );
  assert.equal(
    p.doc.querySelector('#product-dock [data-route="documents"]').textContent,
    'Archivos',
  );
  assert.equal(
    p.doc
      .querySelector('#product-dock [data-route="documents"]')
      .getAttribute('aria-label'),
    'Archivos y documentos',
  );
  p.close();
});

test('optional blocked storage does not prevent navigation or translation', () => {
  const p = page({ blockStorage: true });
  p.doc.querySelector('#product-language').click();
  assert.equal(p.doc.documentElement.lang, 'es');
  p.app.navigate('documents');
  assert.equal(
    p.doc.querySelector('[data-screen]:not([hidden])').dataset.screen,
    'documents',
  );
  p.close();
});

test('only preferences persist; documents, contact names and chats do not enter localStorage', () => {
  const p = page();
  p.app.store.addContact({ name: 'Private test person' });
  p.app.store.addDocument({ name: 'Private file', category: 'legal' });
  p.doc.querySelector('[data-action="theme"]').click();
  const saved = JSON.parse(
    p.dom.window.localStorage.getItem('amparo-product-v2'),
  );
  assert.deepEqual(Object.keys(saved).sort(), [
    'language',
    'notifications',
    'reminders',
    'theme',
    'version',
  ]);
  assert.equal(saved.theme, 'light');
  p.close();
});

test('clipboard denial selects the text instead of falsely reporting copied', async () => {
  const p = page();
  Object.defineProperty(p.dom.window.navigator, 'clipboard', {
    value: {
      writeText: async () => {
        throw new Error('Denied');
      },
    },
  });
  p.app.dialogs.open('share');
  p.doc.querySelector('[data-action="copy-share"]').click();
  await settle();
  assert.equal(
    p.doc.querySelector('#product-toast').textContent,
    'Select and copy the introduction.',
  );
  assert.equal(
    p.doc.querySelector('#share-text').selectionEnd,
    p.doc.querySelector('#share-text').value.length,
  );
  p.close();
});

test('dialog cancel restores focus to its opener', () => {
  const p = page();
  const opener = p.doc.querySelector('.header-alert');
  opener.focus();
  opener.click();
  p.doc
    .querySelector('#product-dialog')
    .dispatchEvent(new p.dom.window.Event('cancel', { cancelable: true }));
  assert.equal(p.doc.querySelector('#product-dialog').open, false);
  assert.equal(p.doc.activeElement, opener);
  p.close();
});

test('icon-only alert has an explicit name when its text is hidden on phones', () => {
  const p = page();
  assert.equal(
    p.doc.querySelector('.header-alert').getAttribute('aria-label'),
    'Family alert',
  );
  p.close();
});

test('reset clears session additions, membership and chat while preserving language and theme', async () => {
  const p = page();
  p.app.store.addContact({ name: 'Extra' });
  p.app.store.activateMembership();
  await p.app.assistant.send('Hello');
  p.app.store.update({ theme: 'light' });
  p.app.dialogs.open('reset');
  p.doc.querySelector('[data-action="confirm-reset"]').click();
  assert.equal(p.app.store.get().contacts.length, 2);
  assert.equal(p.app.store.get().membership, 'preview');
  assert.equal(p.doc.querySelectorAll('.chat-message').length, 0);
  assert.equal(p.app.store.get().theme, 'light');
  p.close();
});

test('language switching preserves conversation and visible search terms', async () => {
  const p = page();
  await p.app.assistant.send('Review my documents');
  for (const id of ['network-search', 'document-search']) {
    p.doc.querySelector(`#${id}`).value = 'nonesuch';
    p.doc
      .querySelector(`#${id}`)
      .dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
  }
  p.doc.querySelector('#product-language').click();
  assert.equal(p.doc.querySelectorAll('.chat-message').length, 2);
  assert.equal(p.doc.querySelector('#network-search').value, 'nonesuch');
  assert.equal(p.doc.querySelector('#document-search').value, 'nonesuch');
  p.close();
});
