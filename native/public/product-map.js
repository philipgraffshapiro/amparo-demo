import { networkLocations } from './product-data.js';
import { icon } from './product-icons.js';
const bounds = (items) => items.map((place) => [place.lat, place.lng]);
class ProductMaps {
  constructor(window, onSelect, enabled) {
    Object.assign(this, { window, onSelect, enabled });
    for (const method of [
      'show',
      'filter',
      'select',
      'style',
      'fit',
      'destroy',
    ])
      this[method] = this[method].bind(this);
    this.maps = new Map();
    this.visible = networkLocations;
    this.reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }
  ensure(kind) {
    const { onSelect } = this;
    if (!this.enabled || !this.window.L || this.maps.has(kind))
      return this.maps.get(kind);
    const element = this.window.document.querySelector(`#${kind}-map`);
    if (!element) return null;
    const L = this.window.L,
      home = kind === 'home';
    const map = L.map(element, {
      zoomControl: !home,
      attributionControl: false,
      scrollWheelZoom: !home,
      dragging: !home,
      doubleClickZoom: !home,
      touchZoom: !home,
      boxZoom: !home,
      keyboard: !home,
      zoomSnap: 0.25,
      minZoom: 7,
      maxZoom: 15,
    }).setView(home ? [26.05, -80.25] : [26.22, -80.16], home ? 9.5 : 9);
    const tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      crossOrigin: true,
    }).addTo(map);
    let loaded = 0;
    tile.on('tileload', () => {
      loaded++;
      element.dataset.tilesLoaded = String(loaded);
      const status = this.window.document.querySelector('#map-status');
      if (status) status.textContent = '';
    });
    tile.on('tileerror', () => {
      if (!loaded && !home) {
        const status = this.window.document.querySelector('#map-status');
        if (status)
          status.textContent =
            this.window.document.documentElement.lang === 'es'
              ? 'El mapa no está disponible. Explora los lugares en la lista.'
              : 'Map imagery is unavailable. Explore locations in the list.';
      }
    });
    const markers = new Map();
    for (const place of networkLocations) {
      const marker = L.marker([place.lat, place.lng], {
        keyboard: !home,
        title: place.name,
        icon: L.divIcon({
          className: `amparo-map-marker ${place.kind}`,
          html: `<span class="marker-pulse"></span><span class="marker-core">${icon(place.kind === 'legal' ? 'legal' : 'people')}</span>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
      }).addTo(map);
      if (!home) marker.on('click', () => onSelect(place.id));
      markers.set(place.id, marker);
    }
    const connection = L.polyline(
      networkLocations
        .filter((place) => place.kind === 'legal')
        .map((place) => [place.lat, place.lng]),
      {
        color: '#e3b575',
        weight: 2,
        opacity: 0.65,
        dashArray: '4 9',
        className: 'network-connection',
        interactive: false,
      },
    ).addTo(map);
    if (!home) {
      map.zoomControl.setPosition('bottomright');
      map.fitBounds(bounds(networkLocations), { padding: [65, 65] });
    }
    const entry = { map, markers, connection };
    this.maps.set(kind, entry);
    element.classList.add('map-dark');
    return entry;
  }
  show(kind) {
    const entry = this.ensure(kind);
    if (entry)
      this.window.requestAnimationFrame(() => {
        entry.map.invalidateSize();
        if (kind === 'network') this.filter(this.visible);
      });
  }
  filter(places) {
    this.visible = places;
    const entry = this.maps.get('network');
    if (!entry) return;
    for (const [id, marker] of entry.markers) {
      if (places.some((p) => p.id === id)) {
        if (!entry.map.hasLayer(marker)) marker.addTo(entry.map);
      } else marker.remove();
    }
    entry.connection.setLatLngs(
      places.filter((p) => p.kind === 'legal').map((p) => [p.lat, p.lng]),
    );
    if (places.length)
      entry.map.fitBounds(
        bounds(places),
        this.window.innerWidth <= 650
          ? {
              paddingTopLeft: [35, 65],
              paddingBottomRight: [35, 150],
              maxZoom: 11,
              animate: !this.reduced,
            }
          : { padding: [60, 70], maxZoom: 11, animate: !this.reduced },
      );
  }
  select(id) {
    const entry = this.ensure('network'),
      place = networkLocations.find((p) => p.id === id);
    if (!entry || !place) return;
    for (const [markerId, marker] of entry.markers)
      marker.getElement()?.classList.toggle('active', markerId === id);
    entry.map.flyTo([place.lat, place.lng], Math.max(entry.map.getZoom(), 11), {
      animate: !this.reduced,
      duration: 0.8,
    });
  }
  style(value) {
    this.window.document
      .querySelector('#network-map')
      ?.classList.toggle('map-dark', value === 'dark');
  }
  fit() {
    this.filter(this.visible);
  }
  destroy() {
    for (const entry of this.maps.values()) entry.map.remove();
    this.maps.clear();
  }
}
export function createProductMaps(window, onSelect, enabled = true) {
  return new ProductMaps(window, onSelect, enabled);
}
