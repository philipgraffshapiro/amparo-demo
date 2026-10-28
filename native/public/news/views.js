import { escapeHTML, localText } from '../product-data.js';
import { snapshotStale } from './model.js';
import { icon } from '../product-icons.js';
import { newsPhoto } from './media.js';

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

function card(item, language, compact, index) {
  const t = words(language);
  const photo = newsPhoto(item);
  return `<article class="news-card${compact ? ' news-card-compact' : ''}${index === 0 ? ' news-card-lead' : ''}${photo ? '' : ' news-card-text-only'}">
    ${photo ? `<figure class="news-photo"><img src="${photo.src}" alt="${escapeHTML(language === 'es' ? photo.es : photo.en)}" width="1100" height="619" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"></figure>` : ''}
    <div class="news-story-body"><p class="news-card-source"><span>${escapeHTML(item.sourceName)}</span><span aria-hidden="true">·</span>${time(item.publishedAt, language, true)}</p>
    <h3 lang="${item.language}">${escapeHTML(item.title)}</h3>
    <a class="news-source-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${t('Read original story', 'Leer noticia original')}${icon('diagonal')}<span class="visually-hidden">: ${escapeHTML(item.title)} · ${t('opens in a new tab', 'abre en otra pestaña')}</span></a>
    <details class="news-provenance"><summary>${t('Source details', 'Detalles de la fuente')}</summary><p>${t('News report · Requires review. Publication and discovery dates do not establish when an event happened.', 'Reporte periodístico · Requiere revisión. Las fechas de publicación y detección no indican cuándo ocurrió un evento.')}</p>
    <dl><div><dt>${t('Published', 'Publicación')}</dt><dd>${time(item.publishedAt, language, item.datePrecision === 'day')}${item.datePrecision === 'day' ? ` · ${t('Date only', 'Solo fecha')}` : ''}</dd></div>
      <div><dt>${t('Detected', 'Detección')}</dt><dd>${time(item.detectedAt, language)}</dd></div>
      <div><dt>${t('Event time', 'Fecha del evento')}</dt><dd>${t('Not reported', 'No reportada')}</dd></div></dl>
    ${photo ? `<p class="news-photo-credit">${t('Article image', 'Imagen del artículo')}: ${escapeHTML(photo.credit)}. ${t('Publisher-selected image; it does not verify an event.', 'Imagen elegida por el medio; no verifica un evento.')}</p>` : ''}</details></div>
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
  const stale = data && snapshotStale(data, now);
  const ageNotice = t(
    'Newer stories may be missing.',
    'Es posible que falten noticias recientes.',
  );
  const status = [];
  if (state.loading)
    status.push(t('Loading published news…', 'Cargando noticias publicadas…'));
  else if (state.fallback || (state.error && data))
    status.push(
      t(
        'Could not refresh. Showing saved stories.',
        'No se pudo actualizar. Se muestran noticias guardadas.',
      ) + (stale ? ` ${ageNotice}` : ''),
    );
  else if (state.error)
    status.push(
      t(
        'News could not load. Try again.',
        'No se pudieron cargar las noticias. Intenta de nuevo.',
      ),
    );
  else if (stale) status.push(ageNotice);
  if (data) {
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
    ${compact ? '' : `<header class="news-heading"><h2>${t('In the news', 'En las noticias')}</h2><p>${t('Immigration reporting from local and national newsrooms.', 'Reportajes sobre inmigración de medios locales y nacionales.')}</p></header>`}
    <div class="news-feed-note"><p>${data ? `${t('Updated', 'Actualizado')} ${time(data.generatedAt, language, true)}` : t('Published news', 'Noticias publicadas')}</p>${retry}</div>
    <div class="news-load-state" role="status" aria-live="polite" ${status.length ? '' : 'hidden'}>${status.map((line) => `<p>${line}</p>`).join('')}</div>
    <div class="news-list">${data?.items.length ? (compact ? data.items.slice(0, 3) : data.items).map((item, index) => card(item, language, compact, index)).join('') : data ? `<p class="news-empty">${t('No published news in this snapshot.', 'No hay noticias publicadas en esta copia.')}</p>` : ''}</div>
    ${!compact && data ? `<details class="news-sources"><summary>${t('Publisher collection status', 'Estado de recopilación por medio')}</summary><p>${t('Snapshot time', 'Fecha de la copia')}: ${time(data.generatedAt, language)}</p><ul>${data.sourceStatus.map((source) => `<li><strong>${escapeHTML(source.name)}</strong> · ${sourceState(source, language)}<br>${t('Last success', 'Último éxito')}: ${time(source.lastSuccessAt, language)}<br>${t('Last attempt', 'Último intento')}: ${time(source.lastAttemptAt, language)}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}
