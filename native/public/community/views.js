import { icon } from '../product-icons.js';
import { escapeHTML, localText } from '../product-data.js';
import { regions, kinds, statuses } from './data.js';

export const textFor = (language) => (en, es) => localText(language, en, es);
export const reportDate = (value, language) =>
  new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(value));

function filterSelect(id, label, options) {
  return `<label class="community-filter"><span>${label}</span><select id="community-${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
}

export function renderCommunityShell(language) {
  const t = textFor(language);
  return `<section class="product-screen community-screen" data-screen="alerts" hidden>
    <div class="community-heading"><div><p class="eyebrow"><span class="community-signal"></span>${t('AWARENESS STARTS HERE', 'LA INFORMACIÓN EMPIEZA AQUÍ')}</p><h1 tabindex="-1">${t('Community alerts', 'Alertas comunitarias')}<span class="community-beta">${t('DEMO', 'DEMO')}</span></h1><p>${t('Immigration activity. Community reports. A clearer picture.', 'Actividad migratoria. Reportes comunitarios. Una visión más clara.')}</p></div>
      <div class="community-heading-actions"><button type="button" class="button quiet" data-community-action="watch">${icon('bell')}<span>${t('My alerts', 'Mis alertas')}</span><i id="community-watch-count">0</i></button><button type="button" class="button community-primary" data-community-action="report">${icon('plus')}${t('Report activity', 'Reportar actividad')}</button></div>
    </div>
    <div class="community-toolbar"><nav class="community-tabs" aria-label="${t('Community views', 'Vistas de la comunidad')}">
      <button type="button" data-community-tab="news" aria-pressed="true">${icon('file')}${t('News', 'Noticias')}</button>
      <button type="button" data-community-tab="map" aria-pressed="true">${icon('network')}${t('Map', 'Mapa')}</button>
      <button type="button" data-community-tab="reports" aria-pressed="false">${icon('file')}${t('Reports', 'Reportes')}</button>
      <button type="button" data-community-tab="stats" aria-pressed="false">${icon('chart')}${t('Statistics', 'Estadísticas')}</button>
    </nav><div class="community-dataset-note"><span></span>${t('Illustrative reports · Not a live feed', 'Reportes ilustrativos · Sin datos en vivo')}</div><button type="button" class="community-export" data-community-action="export" aria-label="${t('Export filtered reports as CSV', 'Exportar reportes filtrados como CSV')}">${icon('download')}<span>${t('Export', 'Exportar')}</span></button></div>
    <div class="community-filters">
      <label class="search-field community-search">${icon('search')}<input id="community-query" type="search" maxlength="100" placeholder="${t('Search a city or report', 'Buscar ciudad o reporte')}" aria-label="${t('Search community reports', 'Buscar reportes comunitarios')}"></label>
      ${filterSelect('range', t('Time period', 'Período'), [
        ['24h', t('Last 24 hours', 'Últimas 24 horas')],
        ['7d', t('Last 7 days', 'Últimos 7 días')],
        ['30d', t('Last 30 days', 'Últimos 30 días')],
      ])}
      ${filterSelect('region', t('Area', 'Zona'), [['all', t('All counties', 'Todos los condados')], ...regions.map((region) => [region.id, region.name])])}
      ${filterSelect('kind', t('Activity', 'Actividad'), [['all', t('All activity', 'Toda actividad')], ...Object.entries(kinds).map(([key, value]) => [key, value[language]])])}
      ${filterSelect('status', t('Review status', 'Revisión'), [['all', t('Any status', 'Todos los estados')], ...Object.entries(statuses).map(([key, value]) => [key, value[language]])])}
    </div>
    <div id="community-load-state" role="status" aria-live="polite"></div>
    <div class="community-workspace">
      <div id="community-news" data-community-panel="news"></div>
      <div class="community-map-layout" data-community-panel="map">
        <aside class="community-feed"><div class="community-feed-heading"><div><h2>${t('Latest reports', 'Últimos reportes')}</h2><p id="community-results-summary"></p></div><span class="community-feed-icon">${icon('pulse')}</span></div><div id="community-list" class="community-list"></div><div class="community-feed-footer">${icon('shield')}<span>${t('Area-level locations. Review the source and status of each report.', 'Ubicaciones aproximadas. Revisa la fuente y el estado de cada reporte.')}</span></div></aside>
        <div class="community-map-canvas"><div id="community-map" role="region" aria-label="${t('Community immigration activity map', 'Mapa de actividad migratoria comunitaria')}"></div>
          <div class="community-map-controls"><div class="community-map-layers"><button type="button" data-community-action="markers" class="selected" aria-pressed="true">${icon('pin')}${t('Reports', 'Reportes')}</button><button type="button" data-community-action="zones" aria-pressed="false">${icon('layers')}${t('Activity zones', 'Zonas de actividad')}</button></div><button type="button" class="community-map-fit" data-community-action="fit" aria-label="${t('Fit all visible reports', 'Ver todos los reportes visibles')}">${icon('expand')}</button></div>
          <div class="community-map-summary"><span class="community-signal"></span><strong data-community-stat="reports">0</strong><span>${t('sample reports in view', 'reportes de ejemplo visibles')}</span><button type="button" data-community-action="street" aria-pressed="false">${t('Street view', 'Calles')}</button></div>
          <div id="community-map-error" class="community-map-error" role="status"></div><div id="community-detail" class="community-detail" hidden></div>
          <div class="community-map-legend"><span><i class="detention"></i>${t('Detention reported', 'Detención reportada')}</span><span><i class="presence"></i>${t('Activity', 'Actividad')}</span><span><i class="advisory"></i>${t('Advisory', 'Aviso')}</span></div>
        </div>
      </div>
      <div class="community-reports-panel" data-community-panel="reports" hidden><div class="community-section-heading"><div><h2>${t('The reports behind the map', 'Los reportes detrás del mapa')}</h2><p>${t('The same filters, the same records. Open any report for context.', 'Los mismos filtros y registros. Abre un reporte para ver el contexto.')}</p></div><span id="community-table-count"></span></div><div id="community-report-table"></div></div>
      <div class="community-stats-panel" data-community-panel="stats" hidden id="community-stats"></div>
    </div>
  </section>`;
}

export function reportCard(report, language, selected = false) {
  const t = textFor(language),
    kind = kinds[report.kind];
  return `<button type="button" class="community-report-card ${selected ? 'selected' : ''}" data-community-report="${escapeHTML(report.id)}" aria-pressed="${selected}">
    <span class="community-report-symbol ${report.kind}">${icon(kind.icon)}</span><span class="community-report-copy"><span class="community-report-top"><strong>${escapeHTML(report.name)}</strong><time datetime="${report.occurredAt}">${reportDate(report.occurredAt, language)}</time></span><span class="community-report-title">${kind[language]}</span><span class="community-report-meta"><span class="community-status ${report.status}">${statuses[report.status][language]}</span>${report.kind === 'detention' ? `<span>${report.people ?? '?'} ${t('people reported', 'personas reportadas')}</span>` : ''}</span></span>${icon('diagonal')}
  </button>`;
}

export function emptyReports(language) {
  const t = textFor(language);
  return `<div class="community-empty">${icon('search')}<h3>${t('No reports match', 'No hay coincidencias')}</h3><p>${t('Try another area or a wider time period.', 'Prueba otra zona o un período más amplio.')}</p><button class="button quiet" type="button" data-community-action="clear">${t('Clear filters', 'Borrar filtros')}</button></div>`;
}

export function reportDetail(report, language, following = false) {
  const t = textFor(language);
  return `<div class="community-detail-top"><span class="community-status ${report.status}">${statuses[report.status][language]}</span><span class="sample-label">${t('SAMPLE REPORT', 'REPORTE DE EJEMPLO')}</span><button type="button" class="icon-button" data-community-action="close-detail" aria-label="${t('Close report details', 'Cerrar detalles')}">${icon('close')}</button></div>
    <h2 tabindex="-1">${kinds[report.kind][language]}</h2><div class="community-detail-location">${icon('pin')}<strong>${escapeHTML(report.name)}</strong><span>· ${reportDate(report.occurredAt, language)}</span></div>
    <p>${escapeHTML(report.description[language] || report.description.en)}</p><dl><div><dt>${t('Reported people', 'Personas reportadas')}</dt><dd>${report.kind !== 'detention' ? t('Not applicable', 'No corresponde') : (report.people ?? t('Unknown', 'Desconocido'))}</dd></div><div><dt>${t('Source', 'Fuente')}</dt><dd>${escapeHTML(report.source[language])}</dd></div></dl>
    <div class="community-detail-actions"><button type="button" class="button quiet" data-community-follow="${report.region}" aria-pressed="${following}">${icon('bell')}${following ? t('Following this area', 'Siguiendo esta zona') : t('Follow this area', 'Seguir esta zona')}</button><button type="button" class="text-action" data-route="network">${t('Find legal help', 'Buscar ayuda legal')}${icon('arrow')}</button></div><small>${t('Illustrative incident. Map position represents the area, not an exact address.', 'Incidente ilustrativo. El mapa representa la zona, no una dirección exacta.')}</small>`;
}

export function reportsTable(reports, language) {
  const t = textFor(language);
  if (!reports.length) return emptyReports(language);
  return `<table class="community-table"><caption class="visually-hidden">${t('Filtered community reports', 'Reportes comunitarios filtrados')}</caption><thead><tr><th>${t('Date / area', 'Fecha / zona')}</th><th>${t('Activity', 'Actividad')}</th><th>${t('Status', 'Estado')}</th><th>${t('People', 'Personas')}</th><th><span class="visually-hidden">${t('Details', 'Detalles')}</span></th></tr></thead><tbody>${reports.map((report) => `<tr><td><strong>${escapeHTML(report.name)}</strong><time datetime="${report.occurredAt}">${reportDate(report.occurredAt, language)}</time></td><td><span class="community-type ${report.kind}"><i></i>${kinds[report.kind][language]}</span></td><td><span class="community-status ${report.status}">${statuses[report.status][language]}</span></td><td>${report.kind === 'detention' ? (report.people ?? t('Unknown', 'Sin dato')) : '—'}</td><td><button type="button" class="icon-button" data-community-report="${escapeHTML(report.id)}" aria-label="${t('Open report in', 'Abrir reporte en')} ${escapeHTML(report.name)}">${icon('diagonal')}</button></td></tr>`).join('')}</tbody></table>`;
}
