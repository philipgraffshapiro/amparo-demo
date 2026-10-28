import { createProductStore } from './product-store.js';
import { createProductServices } from './product-services.js';
import { renderProductShell } from './product-shell.js';
import {
  renderLiveState,
  renderNetwork,
  renderLocation,
} from './product-render.js';
import { createProductMaps } from './product-map.js';
import { createProductAssistant } from './product-assistant.js';
import { createProductDialogs } from './product-dialogs.js';
import { networkLocations, localText } from './product-data.js';
import { bindProductEvents } from './product-events.js';
import { CommunityController } from './community/controller.js';
import { AccountController } from './account/controller.js';
import { FamilyController } from './family/controller.js';
import { NativeKit } from './native/kit.js';

class ProductController {
  constructor(window, options) {
    this.window = window;
    this.document = window.document;
    this.options = options;
    this.features = {
      communityAlerts: options.features?.communityAlerts !== false,
    };
    this.store = options.store || createProductStore(window);
    this.services = options.services || createProductServices(this.features);
    this.current = 'home';
    this.filters = {
      document: 'all',
      documentQuery: '',
      network: 'all',
      networkQuery: '',
    };
    this.navigate = this.navigate.bind(this);
    this.toast = this.toast.bind(this);
    this.selectLocation = this.selectLocation.bind(this);
    this.build();
    this.unsubscribe = this.store.subscribe(() => this.renderState());
    this.unbindEvents = bindProductEvents(this);
    this.navigate(window.location.hash.slice(1) || 'home', {
      focus: false,
      history: false,
    });
  }

  text(en, es) {
    return localText(this.store.get().language, en, es);
  }

  renderState() {
    this.document.documentElement.dataset.theme = this.store.get().theme;
    renderLiveState(this.document, this.store.get(), this.filters);
    this.community?.render();
    this.family?.render();
    this.native?.syncAppearance();
  }

  toast(message) {
    const box = this.document.querySelector('#product-toast');
    box.textContent = message;
    box.classList.add('visible');
    this.window.clearTimeout(this.toastTimer);
    this.toastTimer = this.window.setTimeout(
      () => box.classList.remove('visible'),
      3400,
    );
  }

  reportPreferenceStorage() {
    if (this.store.preferenceStorage?.status === 'unavailable') {
      this.toast(
        this.text(
          'Preferences apply for this visit. This browser could not save them.',
          'Las preferencias se aplican a esta visita. El navegador no pudo guardarlas.',
        ),
      );
    }
  }

  updateNetwork() {
    const places = this.services.network.search({
      query: this.filters.networkQuery,
      kind: this.filters.network,
    });
    renderNetwork(this.document, places, this.store.get());
    this.maps.filter(places);
    this.document
      .querySelectorAll('[data-network-filter]')
      .forEach((button) => {
        const active = button.dataset.networkFilter === this.filters.network;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
      });
  }

  navigate(route, { focus = true, history = true } = {}) {
    const labels = {
      home: 'Home',
      network: 'Network',
      documents: 'Documents',
      assistant: 'Amparo AI',
      circle: 'My circle',
      membership: 'Membership',
      more: 'My account',
    };
    if (this.features.communityAlerts)
      labels.alerts = this.text('Community alerts', 'Alertas comunitarias');
    if (!Object.hasOwn(labels, route)) route = 'home';
    this.current = route;
    const { document, window } = this;
    document.body.dataset.screen = route;
    for (const section of document.querySelectorAll('[data-screen]'))
      section.hidden = section.dataset.screen !== route;
    const dockRoute = [
      'circle',
      'membership',
      ...(this.features.communityAlerts ? ['network'] : []),
    ].includes(route)
      ? 'more'
      : route;
    [...document.querySelectorAll('#product-dock [data-route]')].forEach(
      (button, index) => {
        if (button.dataset.route === dockRoute) {
          button.setAttribute('aria-current', 'page');
          document
            .querySelector('#product-dock')
            .style.setProperty('--dock-index', index);
        } else button.removeAttribute('aria-current');
      },
    );
    document
      .querySelectorAll('.desktop-links [data-route]')
      .forEach((button) => {
        button.classList.toggle('selected', button.dataset.route === route);
        if (button.dataset.route === route)
          button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
    document.querySelectorAll('.site-menu[open]').forEach((menu) => {
      menu.open = false;
    });
    if (history && window.location.hash !== '#' + route)
      window.history.pushState({ route }, '', '#' + route);
    if (
      route === 'network' ||
      (route === 'home' && !this.features.communityAlerts)
    )
      this.maps.show(route);
    this.community?.show(route);
    if (focus)
      document
        .querySelector('[data-screen="' + route + '"] h1')
        ?.focus({ preventScroll: true });
    document.title = labels[route] + ' · Amparo';
  }

  selectLocation(id) {
    const place = networkLocations.find((p) => p.id === id);
    if (!place) return;
    this.navigate('network', { focus: false });
    const detail = this.document.querySelector('#location-detail');
    detail.innerHTML = renderLocation(place, this.store.get().language);
    detail.hidden = false;
    this.maps.select(id);
    this.document
      .querySelectorAll('[data-location]')
      .forEach((row) =>
        row.classList.toggle('selected', row.dataset.location === id),
      );
  }

  build() {
    this.family?.captureDraft();
    this.community?.detach();
    this.maps?.destroy();
    this.dialogs?.cleanup();
    const { window, document, store, services, options } = this;
    this.account?.captureForm();
    document.body.innerHTML = renderProductShell(store.get(), this.features);
    document.documentElement.lang = store.get().language;
    document.documentElement.dataset.theme = store.get().theme;
    this.maps = createProductMaps(
      window,
      this.selectLocation,
      options.maps !== false,
    );
    this.assistant ??= createProductAssistant(
      window,
      store,
      services,
      this.navigate,
      options.animate !== false,
    );
    this.dialogs = createProductDialogs(
      window,
      store,
      services,
      this.navigate,
      this.toast,
      options.animate !== false,
    );
    this.family ??= new FamilyController(this);
    this.account ??= new AccountController(this);
    this.account.mount();
    const nativeBridge = options.nativeBridge || window.AmparoNative;
    if (nativeBridge) {
      this.native ??= new NativeKit(this, nativeBridge);
      this.native.mount();
    }
    if (this.features.communityAlerts) {
      this.community ??= new CommunityController(this);
      this.community.mount();
    }
    document
      .querySelector('#product-dialog')
      .addEventListener('cancel', (event) => {
        event.preventDefault();
        this.dialogs.close();
      });
    document.querySelector('#network-search').value = this.filters.networkQuery;
    document.querySelector('#document-search').value =
      this.filters.documentQuery;
    this.renderState();
    this.assistant.render();
    this.updateNetwork();
    this.navigate(this.current, { focus: false, history: false });
  }

  reset() {
    this.dialogs.close();
    this.assistant.clear();
    this.community?.reset();
    this.family.reset();
    this.store.reset();
    Object.assign(this.filters, {
      document: 'all',
      documentQuery: '',
      network: 'all',
      networkQuery: '',
    });
    this.build();
    this.navigate('home');
    this.toast(
      this.text('A fresh demo is ready.', 'Una nueva demo está lista.'),
    );
  }

  destroy() {
    this.unsubscribe();
    this.maps.destroy();
    this.assistant.destroy();
    this.dialogs.cleanup();
    this.community?.destroy();
    this.family.destroy();
    this.account.destroy();
    this.native?.destroy();
    this.window.clearTimeout(this.toastTimer);
    this.unbindEvents();
  }
}

export function mountProduct(window, options = {}) {
  return new ProductController(window, options);
}
