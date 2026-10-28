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
  return `<section class="community-stats-summary"><h2>${t('Report summary', 'Resumen de reportes')}</h2><p>${t('Totals for the area and dates you selected.', 'Totales para la zona y las fechas seleccionadas.')}</p><dl class="community-stat-counts">${cards.map(([key, value, label]) => `<div><dt>${label}</dt><dd data-stat-value="${key}">${value}</dd></div>`).join('')}</dl></section>
    <div class="community-charts"><article class="community-chart-card"><h2>${t('Reports by day', 'Reportes por día')}</h2><p class="community-chart-caption">${t('Week ending', 'Semana hasta el')} ${reportDate(data.snapshotAt, language)}</p><div class="community-bars" role="img" aria-label="${days.map((day) => `${reportDate(day.date + 'T12:00:00Z', language)}: ${day.count}`).join('; ')}">${days.map((day) => `<div class="community-bar-column"><strong>${day.count}</strong><div class="community-bar-track"><span data-bar-height="${(day.count / maximum) * 100}"></span></div><small>${new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', { weekday: 'short', timeZone: 'America/New_York' }).format(new Date(day.date + 'T12:00:00Z'))}</small></div>`).join('')}</div></article>
    <article class="community-chart-card"><h2>${t('Reports by county', 'Reportes por condado')}</h2><div class="community-area-bars">${stats.areas.map((area) => `<button type="button" data-community-region="${area.id}"><span><strong>${area.name}</strong><b>${area.count}</b></span><span class="community-area-track"><i data-bar-width="${stats.reports ? (area.count / stats.reports) * 100 : 0}"></i></span></button>`).join('')}</div><button type="button" class="button quiet" data-community-tab="map">${t('View on map', 'Ver en el mapa')}</button></article></div>
    <details class="community-stats-method"><summary>${t('How these totals are counted', 'Cómo se calculan los totales')}</summary><p>${t('These are demo reports, not confirmed incidents. Multiple reports may describe the same event. People totals exclude reports without a count.', 'Son reportes de ejemplo, no incidentes confirmados. Varios reportes pueden describir el mismo evento. Los totales excluyen reportes sin cantidad de personas.')}</p></details>`;
}
