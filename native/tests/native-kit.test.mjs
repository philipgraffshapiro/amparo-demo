import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

test('iPhone checklist saves, survives language rebuild, shares and clears', async () => {
  const calls = [];
  const bridge = {
    share: async (value) => calls.push(value),
    remind: async () => {},
    cancelReminder: async () => {},
  };
  const p = page({ nativeBridge: bridge });
  try {
    p.app.navigate('more');
    const item = p.doc.querySelector('[data-native-task="contact"]');
    item.checked = true;
    item.dispatchEvent(new p.dom.window.Event('change', { bubbles: true }));
    assert.equal(
      JSON.parse(
        p.dom.window.localStorage.getItem('amparo.native.preparation.v1'),
      ).contact,
      true,
    );
    p.doc.querySelector('#product-language').click();
    assert.equal(
      p.doc.querySelector('[data-native-task="contact"]').checked,
      true,
    );
    assert.equal(p.doc.querySelectorAll('.native-kit').length, 1);
    p.doc.querySelector('[data-native-action="share"]').click();
    await settle();
    assert.match(calls[0].text, /✓ Elige un contacto/);
    p.doc.querySelector('[data-native-action="clear"]').click();
    await settle();
    assert.equal(
      p.doc.querySelector('[data-native-task="contact"]').checked,
      false,
    );
    assert.equal(
      p.dom.window.localStorage.getItem('amparo.native.preparation.v1'),
      null,
    );
  } finally {
    p.close();
  }
});

test('denied notification permission never claims a reminder was scheduled', async () => {
  const p = page({
    nativeBridge: {
      remind: async () => {
        throw new Error('denied');
      },
    },
  });
  try {
    p.doc.querySelector('[data-native-action="remind"]').click();
    await settle();
    assert.match(
      p.doc.querySelector('#product-toast').textContent,
      /Could not finish/,
    );
  } finally {
    p.close();
  }
});

test('account deletion requires explicit confirmation and sends only once', async () => {
  let calls = 0;
  let finish;
  const service = {
    available: true,
    deletionEnabled: true,
    initialize: async () => ({
      user: { id: 'member', email: 'fixture@example.org' },
    }),
    subscribe: () => () => {},
    deleteAccount: () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  };
  const p = page({ account: { service } });
  try {
    await p.app.account.ready;
    p.doc.querySelector('[data-account-action="open"]').click();
    p.doc.querySelector('[data-account-action="delete"]').click();
    const form = p.doc.querySelector('#account-delete-form');
    form.querySelector('input').value = 'DELETE';
    for (let i = 0; i < 2; i++)
      form.dispatchEvent(
        new p.dom.window.Event('submit', { bubbles: true, cancelable: true }),
      );
    assert.equal(calls, 1);
    finish();
    await settle();
    assert.equal(p.app.account.session, null);
    assert.match(
      p.doc.querySelector('#product-toast').textContent,
      /Account deleted/,
    );
  } finally {
    p.close();
  }
});
