import { MobileSheet } from './sheet.js';

export class MobileSurfaces {
  constructor(app) {
    this.app = app;
    this.sheets = [];
    const { document, window } = app;
    document.documentElement.dataset.mobileSurfaces = 'true';
    this.filters = document.querySelector('.community-filters');
    this.filterHome = document.createComment('community filter home');
    this.filters?.before(this.filterHome);
    const list = document.querySelector('#community-list');
    if (list) {
      this.communityBody = document.createElement('div');
      this.communityBody.className = 'community-sheet-scroll';
      list.before(this.communityBody);
      this.communityBody.append(list);
      this.communityBody.prepend(
        document.querySelector('.community-feed-heading'),
      );
      this.communityBody.append(
        document.querySelector('.community-feed-footer'),
      );
    }
    const add = (selector, options) => {
      const node = document.querySelector(selector);
      if (node) this.sheets.push(new MobileSheet(window, node, options));
    };
    add('.network-sidebar', {
      mode: 'persistent',
      background: '.network-canvas > :not(#location-detail)',
    });
    add('.community-feed', {
      mode: 'persistent',
      body: '.community-sheet-scroll',
      background:
        '.community-map-canvas > :not(#community-detail),.community-heading,.community-toolbar',
    });
    add('#location-detail', {
      mode: 'detail',
      dismiss: () => app.closeLocation(),
    });
    add('#community-detail', {
      mode: 'detail',
      dismiss: () => app.community.closeDetail(),
    });
    add('#product-dialog', {
      mode: 'modal',
      body: '#dialog-content',
      dismiss: () => app.dialogs.close(),
    });
    add('#community-dialog', {
      mode: 'modal',
      body: '#community-dialog-content',
      dismiss: () => app.community.closeDialog(),
    });
    add('#account-access-dialog', {
      mode: 'modal',
      busy: () => app.account.busy,
      dismiss: () => app.account.close(),
    });
    this.viewport = () => this.updateViewport();
    this.focus = (event) => {
      if (event.target.matches('input,textarea,select,:focus-visible'))
        this.reveal(event.target);
    };
    window.addEventListener('resize', this.viewport);
    window.visualViewport?.addEventListener('resize', this.viewport);
    window.visualViewport?.addEventListener('scroll', this.viewport);
    document.addEventListener('focusin', this.focus);
    this.escape = (event) => {
      if (
        event.key !== 'Escape' ||
        document.querySelector('dialog[open],.site-menu[open]')
      )
        return;
      const detail = this.sheets.find(
        (sheet) =>
          sheet.options.mode === 'detail' &&
          !sheet.node.hidden &&
          !sheet.node.closest('section')?.hidden,
      );
      if (detail) {
        event.preventDefault();
        detail.options.dismiss();
      }
    };
    document.addEventListener('keydown', this.escape);
    const map = document.querySelector('[data-community-panel="map"]');
    this.tabObserver = new window.MutationObserver(() => this.placeFilters());
    if (map)
      this.tabObserver.observe(map, {
        attributes: true,
        attributeFilter: ['hidden'],
      });
    this.updateViewport();
  }
  reveal(target) {
    const sheet = this.sheets.find((item) => item.body.contains(target));
    if (!sheet?.enabled) return;
    sheet.state = 'full';
    sheet.measure();
    for (
      let parent = sheet.node.parentElement;
      parent;
      parent = parent.parentElement
    )
      if (parent.matches('section,.community-map-layout,.community-workspace'))
        parent.scrollTop = 0;
    const body = sheet.body.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (rect.bottom > body.bottom)
      sheet.body.scrollTop += rect.bottom - body.bottom + 8;
    if (rect.top < body.top) sheet.body.scrollTop -= body.top - rect.top + 8;
  }
  updateViewport() {
    const { window, document } = this.app;
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const inset = Math.max(
      0,
      window.innerHeight - height - (viewport?.offsetTop || 0),
    );
    document.documentElement.style.setProperty(
      '--visual-height',
      `${height}px`,
    );
    document.documentElement.style.setProperty(
      '--keyboard-inset',
      `${inset}px`,
    );
    document.body.dataset.keyboardOpen = String(
      window.innerWidth <= 700 && inset > 120,
    );
    const available =
      (document.querySelector('#app-main')?.clientHeight || height) -
      (document.querySelector('.map-credit')?.offsetHeight || 0);
    document.documentElement.style.setProperty(
      '--sheet-available-height',
      `${available}px`,
    );
    this.placeFilters();
    for (const sheet of this.sheets) sheet.measure();
    if (inset > 120) {
      window.cancelAnimationFrame(this.frame);
      this.frame = window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active?.matches('input,textarea,select'))
          active.scrollIntoView?.({ block: 'nearest' });
      });
    }
  }
  placeFilters() {
    if (!this.filters || !this.communityBody) return;
    const map = this.app.document.querySelector('[data-community-panel="map"]');
    const inSheet = this.app.window.innerWidth <= 700 && !map.hidden;
    if (inSheet && this.filters.parentNode !== this.communityBody)
      this.communityBody.querySelector('#community-list').before(this.filters);
    if (!inSheet && this.filters.parentNode === this.communityBody)
      this.filterHome.after(this.filters);
  }
  destroy() {
    const { window, document } = this.app;
    for (const sheet of this.sheets) sheet.destroy();
    this.tabObserver.disconnect();
    window.cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.viewport);
    window.visualViewport?.removeEventListener('resize', this.viewport);
    window.visualViewport?.removeEventListener('scroll', this.viewport);
    document.removeEventListener('focusin', this.focus);
    document.removeEventListener('keydown', this.escape);
    delete document.documentElement.dataset.mobileSurfaces;
  }
}
