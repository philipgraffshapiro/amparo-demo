import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

function phone(context) {
  const { dom } = context;
  Object.defineProperty(dom.window, 'innerWidth', {
    value: 390,
    configurable: true,
  });
  Object.defineProperty(dom.window, 'innerHeight', {
    value: 780,
    configurable: true,
  });
  dom.window.dispatchEvent(new dom.window.Event('resize'));
}

function drag(context, node, from, to) {
  const { window } = context.dom;
  const send = (type, y) => {
    const event = new window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: y,
      button: 0,
    });
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      pointerType: { value: 'mouse' },
    });
    node.dispatchEvent(event);
  };
  send('pointerdown', from);
  send('pointermove', to);
  send('pointerup', to);
}

test('map lists pull up, settle at full, and pull down without losing filters', async () => {
  const p = page();
  try {
    phone(p);
    await p.app.community.ready;
    for (const selector of ['.network-sidebar', '.community-feed']) {
      const panel = p.doc.querySelector(selector);
      assert.equal(panel.dataset.mobileSheet, 'persistent');
      const handle = panel.querySelector('.sheet-handle');
      assert.ok(handle, 'Each map list needs an actual draggable handle');
      drag(p, handle, 650, 20);
      assert.equal(panel.dataset.sheetState, 'full');
      drag(p, handle, 20, 750);
      assert.equal(panel.dataset.sheetState, 'peek');
    }
    p.doc.querySelector('#network-search').value = 'Broward';
    p.doc.querySelector('.network-sidebar .sheet-handle').click();
    assert.equal(p.doc.querySelector('#network-search').value, 'Broward');
  } finally {
    p.close();
  }
});

test('all three modal systems have phone sheet handles and call their own dismissal path', async () => {
  const p = page();
  try {
    phone(p);
    const opener = p.doc.querySelector('#product-language');
    for (const [selector, open] of [
      ['#product-dialog', () => p.app.dialogs.open('help')],
      ['#community-dialog', () => p.app.community.action('watch')],
      ['#account-access-dialog', () => p.app.account.open()],
    ]) {
      opener.focus();
      await open();
      await settle();
      const dialog = p.doc.querySelector(selector);
      assert.equal(dialog.dataset.mobileSheet, 'modal');
      const handle = dialog.querySelector('.sheet-handle');
      assert.ok(handle, selector + ' must offer phone dismissal');
      drag(p, handle, 80, 700);
      await settle();
      assert.equal(
        dialog.open,
        false,
        selector + ' must close through its controller',
      );
      assert.equal(p.doc.activeElement, opener);
    }
  } finally {
    p.close();
  }
});

test('an accidental swipe cannot discard a partly filled form', async () => {
  const p = page();
  try {
    phone(p);
    p.app.dialogs.open('contact');
    await settle();
    const field = p.doc.querySelector('#product-dialog [name="name"]');
    field.value = 'Keep my draft';
    field.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
    const handle = p.doc.querySelector('#product-dialog .sheet-handle');
    assert.ok(handle, 'Contact form needs the shared mobile sheet');
    drag(p, handle, 90, 700);
    await settle();
    assert.equal(p.doc.querySelector('#product-dialog').open, true);
    assert.equal(field.value, 'Keep my draft');
    p.app.dialogs.close();
    assert.equal(p.doc.querySelector('#product-dialog').open, false);
  } finally {
    p.close();
  }
});

test('location details are dismissible sheets and preserve the map list', async () => {
  const p = page();
  try {
    phone(p);
    p.doc.querySelector('[data-location]').click();
    await settle();
    const panel = p.doc.querySelector('#location-detail');
    assert.equal(panel.hidden, false);
    assert.equal(panel.dataset.mobileSheet, 'detail');
    const handle = panel.querySelector('.sheet-handle');
    assert.ok(handle);
    drag(p, handle, 100, 750);
    await settle();
    assert.equal(panel.hidden, true);
    assert.ok(p.doc.querySelectorAll('[data-location]').length > 0);
  } finally {
    p.close();
  }
});

test('phone interactions can be disabled without changing the existing product flows', () => {
  const p = page({ features: { mobileSheets: false } });
  try {
    phone(p);
    p.app.dialogs.open('contact');
    assert.equal(p.doc.querySelector('#product-dialog').open, true);
    assert.equal(p.doc.querySelectorAll('.sheet-handle').length, 0);
  } finally {
    p.close();
  }
});
