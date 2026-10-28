import test from 'node:test';
import assert from 'node:assert/strict';
import { page, settle } from './page-fixture.mjs';

function setup() {
  const p = page();
  Object.defineProperty(p.dom.window, 'innerWidth', { value: 390 });
  p.dom.window.dispatchEvent(new p.dom.window.Event('resize'));
  return p;
}
function swipe(p, node, from, to) {
  for (const [type, y] of [
    ['pointerdown', from],
    ['pointermove', to],
    ['pointerup', to],
  ]) {
    const event = new p.dom.window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: y,
    });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    node.dispatchEvent(event);
  }
}
test('replacing a completed form with content does not leave stale dirty-dismissal protection', async () => {
  const p = setup();
  try {
    p.app.dialogs.open('contact');
    await settle();
    const field = p.doc.querySelector('#product-dialog [name="name"]');
    field.value = 'Draft';
    field.dispatchEvent(new p.dom.window.Event('input', { bubbles: true }));
    p.app.dialogs.open('help');
    await settle();
    swipe(p, p.doc.querySelector('#product-dialog .sheet-handle'), 100, 700);
    await settle();
    assert.equal(p.doc.querySelector('#product-dialog').open, false);
  } finally {
    p.close();
  }
});
test('Escape closes a selected location and restores its opener', async () => {
  const p = setup();
  try {
    p.app.navigate('network');
    const opener = p.doc.querySelector('[data-location]');
    opener.focus();
    opener.click();
    await settle();
    p.doc.dispatchEvent(
      new p.dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    );
    assert.equal(p.doc.querySelector('#location-detail').hidden, true);
    assert.equal(p.doc.activeElement, opener);
  } finally {
    p.close();
  }
});
test('cancelled or horizontal gestures do not change the sheet stop', () => {
  const p = setup();
  try {
    const handle = p.doc.querySelector('.network-sidebar .sheet-handle');
    const send = (type, x, y) =>
      handle.dispatchEvent(
        new p.dom.window.MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        }),
      );
    send('pointerdown', 50, 500);
    send('pointermove', 180, 490);
    send('pointerup', 180, 490);
    assert.equal(handle.parentElement.dataset.sheetState, 'peek');
    send('pointerdown', 50, 500);
    send('pointermove', 50, 200);
    send('pointercancel', 50, 200);
    assert.equal(handle.parentElement.dataset.sheetState, 'peek');
  } finally {
    p.close();
  }
});
test('a full list keeps scrolling when it is already away from its top', () => {
  const p = setup();
  try {
    const panel = p.doc.querySelector('.network-sidebar');
    panel.querySelector('.sheet-handle').click();
    const body = panel.querySelector('.sheet-body');
    body.scrollTop = 120;
    swipe(p, body, 150, 500);
    assert.equal(panel.dataset.sheetState, 'full');
    assert.equal(body.scrollTop, 120);
  } finally {
    p.close();
  }
});
