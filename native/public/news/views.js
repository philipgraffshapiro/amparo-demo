import { escapeHTML, localText } from '../product-data.js';
import { snapshotStale } from './model.js';

const words = (language) => (en, es) => localText(language, en, es);

function time(value, language, dayOnly = false) {
  const t = words(language);
  if (!value) return t('Not reported', 'No reportada');
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  };
  if (!dayOnly) Object.assign(options, { hour: 'numeric', minute: '2-digit' });
  const date = new Intl.DateTimeFormat(
    language === 'es' ? 'es-US' : 'en-US',
    options,
  ).format(new Date(value));
  return `<time datetime="${escapeHTML(dayOnly ? value.slice(0, 10) : value)}">${date}${dayOnly ? '' : ' UTC'}</time>`;
}

function card(item, language, compact) {
  const t = words(language);
  return `<article class="news-card${compact ? ' news-card-compact' : ''}">
    <p class="news-card-source">${escapeHTML(item.sourceName)} <span>${t('News report', 'Reporte periodístico')}</span></p>
    <h3 lang="${item.language}">${escapeHTML(item.title)}</h3>
    <dl><div><dt>${t('Published', 'Publicación')}</dt><dd>${time(item.publishedAt, language, item.datePrecision === 'day')}${item.datePrecision === 'day' ? ` · ${t('Date only', 'Solo fecha')}` : ''}</dd></div>
      <div><dt>${t('Detected', 'Detección')}</dt><dd>${time(item.detectedAt, language)}</dd></div>
      <div><dt>${t('Event time', 'Fecha del evento')}</dt><dd>${t('Not reported', 'No reportada')}</dd></div></dl>
    <div class="news-card-footer"><span>${t('Requires review', 'Requiere revisión')}</span><a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${t('Original source', 'Fuente original')}<span class="visually-hidden">: ${escapeHTML(item.title)} · ${t('opens in a new tab', 'abre en otra pestaña')}</span> ↗</a></div>
  </article>`;
}

function sourceState(source, language) {
  const t = words(language);
  if (['ok', 'success', 'healthy', 'fresh'].includes(source.status))
    return t('Available', 'Disponible');
  if (['failed', 'error'].includes(source.status)) return t('Failed', 'Falló');
  if (source.status === 'stale') return t('Stale', 'Desactualizada');
  return t('Status unknown', 'Estado desconocido');
}

export function renderNews(
  state,
  language,
  { compact = false, now = Date.now() } = {},
) {
  const t = words(language),
    data = state.data;
  const status = [];
  if (state.loading)
    status.push(t('Loading published news…', 'Cargando noticias publicadas…'));
  if (state.error)
    status.push(
      t(
        'News could not load. Try again.',
        'No se pudieron cargar las noticias. Intenta de nuevo.',
      ),
    );
  if (state.fallback)
    status.push(
      t(
        'Saved snapshot · Online refresh failed.',
        'Copia guardada · Falló la actualización en línea.',
      ),
    );
  if (data) {
    status.push(
      `${t('Snapshot time', 'Fecha de la copia')}: ${time(data.generatedAt, language)}`,
    );
    if (snapshotStale(data, now))
      status.push(
        t(
          'Stale snapshot · It may miss newer reports.',
          'Copia desactualizada · Puede omitir reportes nuevos.',
        ),
      );
    if (data.omitted)
      status.push(
        t(
          'Some records were omitted because they were invalid or unsafe.',
          'Se omitieron registros por datos inválidos o enlaces inseguros.',
        ),
      );
  }
  const retry = `<button type="button" data-community-action="news-retry" ${state.loading ? 'disabled' : ''}>${t('Refresh news', 'Actualizar noticias')}</button>`;
  return `<div class="news-view${compact ? ' news-preview' : ''}" aria-busy="${Boolean(state.loading)}">
    <div class="news-load-state" role="status" aria-live="polite">${status.map((line) => `<p>${line}</p>`).join('')}${retry}</div>
    ${compact ? '' : `<p class="news-explainer">${t('Published reports in each outlet’s original language. Event details still need review; these are not emergency alerts.', 'Reportes publicados en el idioma original del medio. Los detalles del evento requieren revisión; no son alertas de emergencia.')}</p>`}
    ${compact ? '' : `<h2>${t('Published news', 'Noticias publicadas')}</h2>`}<div class="news-list">${data?.items.length ? (compact ? data.items.slice(0, 2) : data.items).map((item) => card(item, language, compact)).join('') : data ? `<p class="news-empty">${t('No published news in this snapshot.', 'No hay noticias publicadas en esta copia.')}</p>` : ''}</div>
    ${!compact && data ? `<details class="news-sources"><summary>${t('Publisher collection status', 'Estado de recopilación por medio')}</summary><ul>${data.sourceStatus.map((source) => `<li><strong>${escapeHTML(source.name)}</strong> · ${sourceState(source, language)}<br>${t('Last success', 'Último éxito')}: ${time(source.lastSuccessAt, language)}<br>${t('Last attempt', 'Último intento')}: ${time(source.lastAttemptAt, language)}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}
