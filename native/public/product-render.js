import { icon } from './product-icons.js';
import { escapeHTML, localText, documentCategories } from './product-data.js';

export function renderLiveState(document, state, filters = {}) {
  const t = (en, es) => localText(state.language, en, es);
  const set = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };
  const categories = new Set(state.documents.map((item) => item.category));
  set('#welcome-name', state.name.split(/\s+/)[0]);
  const initials = state.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document
    .querySelectorAll('.header-avatar,.home-greeting>.avatar,.account-avatar')
    .forEach((node) => {
      node.textContent = initials;
      if (node.classList.contains('header-avatar'))
        node.setAttribute(
          'aria-label',
          `${initials} · ${t('Open account', 'Abrir cuenta')}`,
        );
    });
  set('#account-name', state.name);
  set('#account-email', state.email);
  set('#card-member-name', state.name);
  set(
    '#home-readiness',
    `${categories.size} / 5 ${t('categories ready', 'categorías listas')}`,
  );
  set(
    '#home-circle-count',
    `${state.contacts.length} ${t('trusted contacts', 'contactos de confianza')}`,
  );
  set(
    '#ai-doc-count',
    `${state.documents.length} ${t('records in your space', 'registros en tu espacio')}`,
  );
  set(
    '#ai-contact-count',
    `${state.contacts.length} ${t('people in your circle', 'personas en tu círculo')}`,
  );
  set(
    '#membership-label',
    state.membership === 'active'
      ? t('DEMO ACTIVE', 'DEMO ACTIVA')
      : t('EXPLORE THE PLAN', 'EXPLORA EL PLAN'),
  );
  set(
    '#membership-checkout',
    state.membership === 'active'
      ? t('View sample receipt', 'Ver recibo de ejemplo')
      : t('Explore signup & checkout', 'Explorar inscripción y pago'),
  );
  set(
    '#appearance-label',
    state.theme === 'dark'
      ? t('Dark · switch to light', 'Oscuro · cambiar a claro')
      : t('Light · switch to dark', 'Claro · cambiar a oscuro'),
  );
  document.querySelector('.theme-control').innerHTML = icon(
    state.theme === 'dark' ? 'sun' : 'moon',
  );
  document
    .querySelector('#reminder-toggle')
    ?.setAttribute('aria-checked', String(state.reminders));
  const pct = categories.size * 20;
  document.querySelector('#readiness-percent').innerHTML =
    `${pct}<span>%</span>`;
  document.querySelector('#readiness-ring-progress').style.strokeDasharray =
    `${pct} 100`;
  document.querySelector('#preparation-list').innerHTML = documentCategories
    .map(
      (cat) =>
        `<button type="button" class="preparation-row ${categories.has(cat.id) ? 'prepared' : ''}" data-doc-filter="${cat.id}"><span>${icon(categories.has(cat.id) ? 'check' : 'plus')}</span>${t(cat.en, cat.es)}<small>${categories.has(cat.id) ? t('Added', 'Añadido') : t('Add', 'Añadir')}</small></button>`,
    )
    .join('');
  for (const cat of documentCategories)
    set(
      `[data-folder-count="${cat.id}"]`,
      `${state.documents.filter((d) => d.category === cat.id).length} ${t('documents', 'documentos')}`,
    );
  const category = documentCategories.find(
    (cat) => cat.id === filters.document,
  );
  set(
    '#document-list-title',
    category
      ? t(category.en, category.es)
      : t('All documents', 'Todos los documentos'),
  );
  document
    .querySelectorAll('[data-doc-filter]')
    .forEach((button) =>
      button.classList.toggle(
        'selected',
        button.dataset.docFilter === filters.document,
      ),
    );
  const docs = state.documents.filter(
    (item) =>
      (!filters.document ||
        filters.document === 'all' ||
        item.category === filters.document) &&
      `${item.name} ${item.nameEs || ''}`
        .toLowerCase()
        .includes((filters.documentQuery || '').toLowerCase()),
  );
  document.querySelector('#document-rows').innerHTML = docs.length
    ? docs
        .map(
          (item) =>
            `<button type="button" class="document-row" data-preview="${item.id}"><span class="file-name"><span class="file-icon">${icon('file')}</span><span><strong>${escapeHTML(state.language === 'es' && item.nameEs ? item.nameEs : item.name)}</strong><small>${item.sample ? t('Sample document', 'Documento de ejemplo') : t('On this device', 'En este dispositivo')}</small></span></span><span class="file-category">${t(documentCategories.find((cat) => cat.id === item.category).en, documentCategories.find((cat) => cat.id === item.category).es)}</span><span class="file-size">${Math.max(1, Math.round(item.size / 1024))} KB</span>${icon('diagonal')}</button>`,
        )
        .join('')
    : `<div class="empty-state">${icon('documents')}<h3>${t('A clear space to start.', 'Un espacio para empezar.')}</h3><p>${t('Add a document here or choose another category.', 'Añade un documento o elige otra categoría.')}</p><button type="button" class="text-action" data-dialog="upload">${t('Add a document', 'Añadir un documento')}${icon('plus')}</button></div>`;
  document.querySelector('#contact-cards').innerHTML =
    state.contacts
      .map(
        (person) =>
          `<article class="contact-card"><span class="avatar">${escapeHTML(person.initials)}</span><button type="button" class="icon-button contact-remove" data-remove-contact="${person.id}" aria-label="${t('Remove', 'Eliminar')} ${escapeHTML(person.name)}">${icon('close')}</button><h3>${escapeHTML(person.name)}</h3><p>${escapeHTML(state.language === 'es' && person.relationEs ? person.relationEs : person.relation || '')}</p><span class="contact-phone">${escapeHTML(person.phone || t('No phone added', 'Sin teléfono'))}</span><small><i></i>${t('In your circle', 'En tu círculo')}</small></article>`,
      )
      .join('') +
    `<button type="button" class="contact-card add-contact" data-dialog="contact">${icon('plus')}<strong>${t('Make room for someone.', 'Un lugar para alguien más.')}</strong><span>${t('Add a trusted person', 'Añade una persona de confianza')}</span></button>`;
  document.querySelector('#activity-list').innerHTML = state.activity
    .slice(0, 5)
    .map(
      (item) =>
        `<li><i></i><span>${escapeHTML(t(item.en, item.es))}<small>${t('This demo session', 'Esta sesión de ejemplo')}</small></span></li>`,
    )
    .join('');
}

export function renderNetwork(document, places, state) {
  const t = (en, es) => localText(state.language, en, es);
  document.querySelector('#network-count').textContent =
    `${places.length} ${t('locations', 'lugares')}`;
  document.querySelector('#network-results').innerHTML = places.length
    ? places
        .map(
          (place, index) =>
            `<button type="button" class="location-row" data-location="${place.id}" data-kind="${place.kind}"><span class="location-initial ${place.kind}">${icon(place.kind === 'legal' ? 'legal' : 'people')}</span><span><small>${escapeHTML(place.city)}<span>0${index + 1}</span></small><strong>${escapeHTML(t(place.name, place.es))}</strong><span>${escapeHTML(t(place.detail, place.detailEs))}</span><em>${place.languages}</em></span>${icon('diagonal')}</button>`,
        )
        .join('')
    : `<div class="empty-state">${icon('search')}<h2>${t('No locations found.', 'No hay resultados.')}</h2><p>${t('Try Miami, Broward or Palm Beach.', 'Prueba Miami, Broward o Palm Beach.')}</p><button class="text-action" type="button" data-action="clear-network">${t('Clear filters', 'Limpiar filtros')}${icon('arrow')}</button></div>`;
}

export function renderLocation(place, language) {
  const t = (en, es) => localText(language, en, es);
  return `<button type="button" class="icon-button detail-close" data-action="close-location" aria-label="${t('Close location', 'Cerrar lugar')}">${icon('close')}</button><p class="eyebrow">${escapeHTML(place.area)} / ${t('SAMPLE LOCATION', 'LUGAR DE EJEMPLO')}</p><div class="detail-title"><span class="location-initial ${place.kind}">${icon(place.kind === 'legal' ? 'legal' : 'people')}</span><h2>${escapeHTML(t(place.name, place.es))}</h2></div><p>${escapeHTML(t(place.detail, place.detailEs))}</p><div class="detail-facts"><span>${icon('pin')}${escapeHTML(place.city)}, FL</span><span>${icon('people')}${place.languages}</span></div><button type="button" class="button primary full" data-book="${place.id}">${t('Plan a sample consultation', 'Planificar una consulta de ejemplo')}${icon('arrow')}</button>`;
}
