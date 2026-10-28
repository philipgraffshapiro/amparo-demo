import { bindSheetGestures } from './sheet-gestures.js';

function editedField(field) {
  if (field.type === 'file') return Boolean(field.files?.length);
  if (['checkbox', 'radio'].includes(field.type))
    return field.checked !== field.defaultChecked;
  if (field.tagName === 'SELECT') {
    const initial = [...field.options].findIndex(
      (option) => option.defaultSelected,
    );
    return field.selectedIndex !== Math.max(0, initial);
  }
  return field.value !== field.defaultValue;
}

export class MobileSheet {
  constructor(window, node, options) {
    Object.assign(this, { window, node, options });
    this.state = options.mode === 'persistent' ? 'peek' : 'full';
    this.offset = 0;
    this.changedFields = new Set();
    if (!node.id)
      node.id =
        'mobile-sheet-' +
        window.document.querySelectorAll('[data-mobile-sheet]').length;
    node.dataset.mobileSheet = options.mode;
    this.refresh();
    this.unbind = bindSheetGestures(this);
    this.onInput = (event) => {
      this.changedFields.add(event.target);
    };
    node.addEventListener('input', this.onInput);
    node.addEventListener('change', this.onInput);
    this.observer = new window.MutationObserver(() => this.refresh());
    this.observer.observe(node, {
      childList: true,
      attributes: true,
      attributeFilter: ['open', 'hidden'],
    });
    this.resize = window.ResizeObserver
      ? new window.ResizeObserver(() => this.measure())
      : null;
    this.resize?.observe(node);
  }
  get enabled() {
    return this.window.innerWidth <= 700;
  }
  get dirty() {
    return (
      [...this.changedFields].some((field) => this.node.contains(field)) ||
      [
        ...this.node.querySelectorAll(
          'form input:not([type="hidden"]), form textarea, form select',
        ),
      ].some(editedField)
    );
  }
  height() {
    return (
      this.node.getBoundingClientRect().height ||
      Math.max(260, this.window.innerHeight - 160)
    );
  }
  stops() {
    const height = this.height();
    return {
      full: 0,
      middle: height * 0.46,
      peek: Math.max(0, height - Math.min(180, height * 0.4)),
    };
  }
  paintedOffset() {
    const transform = this.window.getComputedStyle(this.node).transform;
    if (transform && transform !== 'none' && this.window.DOMMatrixReadOnly) {
      return new this.window.DOMMatrixReadOnly(transform).m42;
    }
    return this.offset;
  }
  refresh() {
    const { node, window, options } = this;
    let handle = node.querySelector(':scope > .sheet-handle');
    if (!handle) {
      handle = window.document.createElement('button');
      handle.type = 'button';
      handle.className = 'sheet-handle';
      handle.addEventListener('click', () => {
        if (options.mode === 'modal') this.release(this.height(), 0);
        else this.setState(this.state === 'full' ? 'peek' : 'full');
      });
      handle.addEventListener('keydown', (event) => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        this.setState(
          ['ArrowUp', 'Home'].includes(event.key) ? 'full' : 'peek',
        );
      });
      node.prepend(handle);
    }
    this.handle = handle;
    this.body = options.body
      ? node.querySelector(options.body)
      : node.querySelector(':scope > .sheet-wrap');
    if (!this.body) {
      this.body = window.document.createElement('div');
      this.body.className = 'sheet-wrap';
      this.body.append(
        ...[...node.childNodes].filter((child) => child !== handle),
      );
      node.append(this.body);
    }
    this.body.classList.add('sheet-body');
    if (!this.body.id) this.body.id = node.id + '-sheet-body';
    handle.setAttribute('aria-controls', this.body.id);
    const open = node.tagName === 'DIALOG' ? node.open : !node.hidden;
    if (open && !this.wasOpen) {
      this.changedFields.clear();
      this.state = options.mode === 'persistent' ? this.state : 'full';
      node.classList.remove('sheet-closing');
      if (options.mode === 'detail') {
        const heading = node.querySelector('h2');
        if (heading) {
          heading.id = node.id + '-heading';
          heading.tabIndex = -1;
          node.setAttribute('role', 'region');
          node.setAttribute('aria-labelledby', heading.id);
          heading.focus({ preventScroll: true });
        }
      }
    }
    this.wasOpen = open;
    this.measure();
  }
  paint(offset) {
    this.offset = offset;
    this.node.style.setProperty('--sheet-y', `${offset}px`);
  }
  measure(animate = false) {
    if (!animate) {
      this.node.classList.add('sheet-remeasuring');
      this.window.cancelAnimationFrame(this.measureFrame);
      this.measureFrame = this.window.requestAnimationFrame(() =>
        this.node.classList.remove('sheet-remeasuring'),
      );
    }
    this.paint(this.enabled ? this.stops()[this.state] : 0);
    this.node.dataset.sheetState = this.state;
    if (this.options.background)
      this.window.document
        .querySelectorAll(this.options.background)
        .forEach((element) => {
          element.inert = this.enabled && this.state === 'full';
        });
    this.handle.setAttribute('aria-expanded', String(this.state === 'full'));
    const es = this.window.document.documentElement.lang === 'es';
    const expand =
      this.options.mode === 'persistent'
        ? ['Show list', 'Mostrar lista']
        : ['Expand panel', 'Ampliar panel'];
    const collapse =
      this.options.mode === 'persistent'
        ? ['Show map', 'Mostrar mapa']
        : ['Collapse panel', 'Reducir panel'];
    const labels =
      this.options.mode === 'modal'
        ? ['Close panel', 'Cerrar panel']
        : this.state === 'full'
          ? collapse
          : expand;
    this.handle.setAttribute('aria-label', labels[es ? 1 : 0]);
  }
  setState(state) {
    if (!this.enabled) return;
    // Modal content may expand, but cannot be hidden behind a collapsed modal backdrop.
    this.state = this.options.mode === 'modal' ? 'full' : state;
    this.measure(true);
  }
  release(offset, velocity) {
    if (
      this.options.mode !== 'persistent' &&
      (offset > 100 || velocity > 0.65)
    ) {
      if (this.dirty || this.options.busy?.()) return this.setState('full');
      this.options.dismiss?.();
      return this.setState('full');
    }
    const stops = Object.entries(this.stops());
    const projected = Math.max(
      0,
      offset + Math.max(-160, Math.min(160, velocity * 130)),
    );
    const target = stops.reduce((best, stop) =>
      Math.abs(stop[1] - projected) < Math.abs(best[1] - projected)
        ? stop
        : best,
    );
    this.setState(target[0]);
  }
  destroy() {
    this.window.cancelAnimationFrame(this.measureFrame);
    this.observer.disconnect();
    this.resize?.disconnect();
    this.unbind();
    this.node.removeEventListener('input', this.onInput);
    this.node.removeEventListener('change', this.onInput);
  }
}
