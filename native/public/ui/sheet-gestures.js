// Native scrolling owns a full sheet; only an outward gesture at its top
// hands control back to the sheet. Map gestures never enter this listener.
export function bindSheetGestures(sheet) {
  const { node, window } = sheet;
  let drag;
  let suppressClick = false;
  const point = (event) =>
    event.touches?.[0] || event.changedTouches?.[0] || event;
  const start = (event) => {
    if (!sheet.enabled || drag || event.isPrimary === false) return;
    if (
      event.type === 'pointerdown' &&
      (event.pointerType === 'touch' || event.button !== 0)
    )
      return;
    if (event.touches?.length > 1) return;
    const handle = event.target.closest('.sheet-handle');
    if (
      !handle &&
      event.target.closest('input,textarea,select,a,summary,[contenteditable]')
    )
      return;
    if (!handle && !sheet.body.contains(event.target)) return;
    const p = point(event);
    drag = {
      x: p.clientX,
      y: p.clientY,
      offset: sheet.paintedOffset(),
      lastY: p.clientY,
      time: event.timeStamp,
      velocity: 0,
      moved: false,
      handle: Boolean(handle),
      id: event.pointerId,
      target: event.target,
    };
    if (event.pointerId !== undefined)
      event.target.setPointerCapture?.(event.pointerId);
    suppressClick = false;
  };
  const move = (event) => {
    if (!drag) return;
    if (event.touches?.length > 1) return cancel();
    const p = point(event);
    const dy = p.clientY - drag.y;
    if (!drag.moved) {
      if (Math.max(Math.abs(dy), Math.abs(p.clientX - drag.x)) < 7) return;
      if (Math.abs(p.clientX - drag.x) > Math.abs(dy)) return cancel();
      if (
        !drag.handle &&
        (sheet.body.scrollTop > 1 || (sheet.state === 'full' && dy < 0))
      )
        return cancel();
      drag.moved = true;
      node.classList.add('sheet-dragging');
      if (drag.id !== undefined) drag.target.setPointerCapture?.(drag.id);
    }
    if (event.cancelable) event.preventDefault();
    const elapsed = event.timeStamp - drag.time;
    if (elapsed > 0) drag.velocity = (p.clientY - drag.lastY) / elapsed;
    drag.lastY = p.clientY;
    drag.time = event.timeStamp;
    sheet.paint(Math.max(0, Math.min(sheet.height(), drag.offset + dy)));
  };
  const end = (event) => {
    if (!drag) return;
    const last = drag;
    drag = null;
    node.classList.remove('sheet-dragging');
    if (!last.moved) return;
    suppressClick = true;
    const offset = sheet.offset;
    if (last.target.hasPointerCapture?.(last.id))
      last.target.releasePointerCapture(last.id);
    const velocity = event.timeStamp - last.time > 100 ? 0 : last.velocity;
    sheet.release(offset, velocity);
  };
  const cancel = () => {
    if (!drag) return;
    drag = null;
    node.classList.remove('sheet-dragging');
    sheet.measure();
  };
  const click = (event) => {
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const events = {
    pointerdown: start,
    pointermove: move,
    pointerup: end,
    pointercancel: cancel,
    lostpointercapture: cancel,
    touchstart: start,
    touchmove: move,
    touchend: end,
    touchcancel: cancel,
  };
  for (const [type, fn] of Object.entries(events))
    node.addEventListener(type, fn, { passive: false });
  node.addEventListener('click', click, true);
  const blur = () => cancel();
  window.addEventListener('blur', blur);
  return () => {
    for (const [type, fn] of Object.entries(events))
      node.removeEventListener(type, fn);
    node.removeEventListener('click', click, true);
    window.removeEventListener('blur', blur);
  };
}
