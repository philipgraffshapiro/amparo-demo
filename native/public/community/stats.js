import { icon } from '../product-icons.js';
import { timeline } from './model.js';
import { textFor, reportDate } from './views.js';

export function renderCommunityStats(data, language) {
  const t = textFor(language),
    { stats, reports } = data;
  const days = timeline(reports, data.snapshotAt);
  const maximum = Math.max(1, ...days.map((day) => day.count));
  const cards = [
    [
      'reports',
      stats.reports,
      t('Community reports', 'Reportes comunitarios'),
      t('Matching your filters', 'Según tus filtros'),
      'file',
    ],
    [
      'detentions',
      stats.detentions,
      t('Detention reports', 'Reportes de detención'),
      t('Reports, not unique incidents', 'Reportes, no incidentes únicos'),
      'alerts',
    ],
    [
      'people',
      stats.people,
      t('People reported detained', 'Personas reportadas detenidas'),
      t(
        `${stats.unknownPeople} reports have no count`,
        `${stats.unknownPeople} reportes sin cantidad`,
      ),
      'people',
    ],
    [
      'unconfirmed',
      stats.unconfirmed,
      t('Unconfirmed reports', 'Reportes sin confirmar'),
      t('Awaiting corroboration', 'Pendientes de corroboración'),
      'clock',
    ],
  ];
  return `<div class="community-metric-grid">${cards.map(([key, value, label, note, glyph]) => `<article class="community-metric"><div>${icon(glyph)}<span>${label}</span></div><strong data-stat-value="${key}">${value}</strong><p>${note}</p></article>`).join('')}</div>
    <div class="community-charts"><article class="community-chart-card"><div class="community-section-heading"><div><p class="eyebrow">${t('THE RECENT PICTURE', 'EL PANORAMA RECIENTE')}</p><h2>${t('Reports over the last week', 'Reportes de la última semana')}</h2></div><span class="sample-label">${t('SAMPLE DATA', 'DATOS DE EJEMPLO')}</span></div><div class="community-bars" role="img" aria-label="${days.map((day) => `${reportDate(day.date + 'T12:00:00Z', language)}: ${day.count}`).join('; ')}">${days.map((day) => `<div class="community-bar-column"><strong>${day.count}</strong><div class="community-bar-track"><span data-bar-height="${(day.count / maximum) * 100}"></span></div><small>${reportDate(day.date + 'T12:00:00Z', language)}</small></div>`).join('')}</div><p class="community-chart-caption">${t('Seven 24-hour periods ending Oct 27, noon ET. Counts reflect your current filters.', 'Siete períodos de 24 horas hasta el 27 de oct., mediodía ET. Los totales reflejan tus filtros actuales.')}</p></article>
    <article class="community-chart-card"><p class="eyebrow">${t('BY COMMUNITY', 'POR COMUNIDAD')}</p><h2>${t('Where reports are coming from', 'De dónde vienen los reportes')}</h2><div class="community-area-bars">${stats.areas.map((area) => `<button type="button" data-community-region="${area.id}"><span><strong>${area.name}</strong><b>${area.count}</b></span><span class="community-area-track"><i data-bar-width="${stats.reports ? (area.count / stats.reports) * 100 : 0}"></i></span></button>`).join('')}</div><button type="button" class="text-action" data-community-tab="map">${t('Explore on the map', 'Explorar en el mapa')}${icon('arrow')}</button></article></div>
    <div class="community-method-note">${icon('help')}<div><strong>${t('What these numbers mean', 'Qué significan estas cifras')}</strong><p>${t('This entire dataset is illustrative. Counts describe reports, not confirmed enforcement totals. People counts are reported estimates, may overlap, and exclude unknown counts. Filters apply to every number and to your export.', 'Todos estos datos son ilustrativos. Los totales describen reportes, no cifras confirmadas de actividad migratoria. Las cantidades de personas son estimaciones reportadas, pueden solaparse y excluyen datos desconocidos. Los filtros se aplican a todas las cifras y a la exportación.')}</p></div></div>`;
}
