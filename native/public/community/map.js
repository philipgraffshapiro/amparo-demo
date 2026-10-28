import { icon } from '../product-icons.js';

const colors = {
  detention: '#f18c79',
  presence: '#e8be7b',
  advisory: '#96b8ad',
};

function groupedReports(reports) {
  const groups = new Map();
  for (const report of reports) {
    if (!groups.has(report.city)) groups.set(report.city, []);
    groups.get(report.city).push(report);
  }
  return [...groups.values()];
}

export class CommunityMaps {
  constructor(window, onSelect, enabled) {
    Object.assign(this, { window, onSelect, enabled });
    this.entries = new Map();
    this.layer = 'markers';
    this.street = false;
    this.reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }

  ensure(home = false) {
    const key = home ? 'home' : 'alerts';
    if (this.entries.has(key)) return this.entries.get(key);
    const element = this.window.document.querySelector(
      home ? '#home-alert-map' : '#community-map',
    );
    const L = this.window.L;
    if (!this.enabled || !L || !element) return null;
    const map = L.map(element, {
      zoomControl: !home,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: !home,
      touchZoom: !home,
      doubleClickZoom: !home,
      boxZoom: !home,
      keyboard: !home,
      zoomSnap: 0.25,
      minZoom: 6,
      maxZoom: 14,
    }).setView(home ? [26.1, -80.3] : [26.15, -80.3], 9);
    map.zoomControl?.setPosition('bottomright');
    const tiles = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
    ).addTo(map);
    let loaded = 0;
    tiles.on('tileload', () => {
      element.dataset.tilesLoaded = String(++loaded);
      if (!home) this.status('');
    });
    tiles.on('tileerror', () => {
      if (!home && !loaded)
        this.status(
          this.window.document.documentElement.lang === 'es'
            ? 'El mapa no está disponible. Todos los reportes siguen en la lista.'
            : 'Map imagery is unavailable. Every report is still available in the list.',
        );
    });
    element.classList.toggle('map-dark', !this.street || home);
    const entry = {
      map,
      element,
      layer: L.layerGroup().addTo(map),
      markers: new Map(),
      reports: [],
    };
    this.entries.set(key, entry);
    return entry;
  }

  status(message) {
    const element = this.window.document.querySelector('#community-map-error');
    if (element) element.textContent = message;
  }

  show(reports, home = false) {
    const entry = this.ensure(home);
    if (!entry) return;
    this.update(reports, home);
    this.window.requestAnimationFrame(() => {
      if (!this.entries.has(home ? 'home' : 'alerts')) return;
      entry.map.invalidateSize();
      if (!entry.fitted && !home) {
        this.fit();
        entry.fitted = true;
      }
    });
  }

  update(reports, home = false) {
    const entry = this.entries.get(home ? 'home' : 'alerts');
    if (!entry) return;
    entry.reports = reports;
    entry.layer.clearLayers();
    entry.markers.clear();
    const L = this.window.L;
    for (const group of groupedReports(reports)) {
      const report =
        group.find((item) => item.kind === 'detention') || group[0];
      const point = [report.lat, report.lng];
      if (this.layer === 'zones' && !home)
        L.circle(point, {
          radius: 3500 + group.length * 1600,
          color: colors[report.kind],
          fillColor: colors[report.kind],
          fillOpacity: 0.2,
          weight: 1,
        }).addTo(entry.layer);
      const marker = L.marker(point, {
        keyboard: !home,
        interactive: !home,
        title: `${report.name}: ${group.length} ${this.window.document.documentElement.lang === 'es' ? 'reportes de ejemplo' : 'sample reports'}`,
        icon: L.divIcon({
          className: `community-marker ${report.kind}`,
          html: `<span class="community-marker-ring"></span><span class="community-marker-core">${group.length > 1 ? `<b>${group.length}</b>` : icon(report.kind === 'detention' ? 'alerts' : report.kind === 'advisory' ? 'bell' : 'pin')}</span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        }),
      }).addTo(entry.layer);
      marker.getElement()?.setAttribute('aria-label', marker.options.title);
      if (!home) marker.on('click', () => this.onSelect(report.id));
      for (const item of group) entry.markers.set(item.id, marker);
    }
    entry.element.dataset.reportCount = String(reports.length);
    entry.element.dataset.markerCount = String(groupedReports(reports).length);
  }

  select(report) {
    const entry = this.ensure();
    if (!entry) return;
    const selected = entry.markers.get(report.id);
    for (const marker of new Set(entry.markers.values()))
      marker.getElement()?.classList.toggle('active', marker === selected);
    entry.map.flyTo([report.lat, report.lng], 10.5, {
      animate: !this.reduced,
      duration: 0.65,
    });
  }

  fit() {
    const entry = this.entries.get('alerts');
    if (!entry?.reports.length) return;
    entry.map.fitBounds(
      entry.reports.map((report) => [report.lat, report.lng]),
      {
        paddingTopLeft: [45, 100],
        paddingBottomRight: [45, 60],
        maxZoom: 10.5,
        animate: !this.reduced,
      },
    );
  }

  setLayer(value) {
    this.layer = value;
    const entry = this.entries.get('alerts');
    if (entry) this.update(entry.reports);
  }

  toggleStreet() {
    this.street = !this.street;
    this.entries
      .get('alerts')
      ?.element.classList.toggle('map-dark', !this.street);
    return this.street;
  }

  destroy() {
    for (const entry of this.entries.values()) entry.map.remove();
    this.entries.clear();
  }
}
