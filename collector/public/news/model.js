import { newsMedia } from './image-policy.js';

const MAX_ITEMS = 1000;
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function validTime(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function sourceURL(value) {
  if (!text(value, 4096)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function newsItem(item) {
  if (!item || !text(item.id, 300) || !text(item.title, 2000)) return null;
  if (!text(item.sourceId, 300) || !text(item.sourceName, 300)) return null;
  const url = sourceURL(item.url);
  if (!url || !validTime(item.detectedAt)) return null;
  if (item.publishedAt !== null && !validTime(item.publishedAt)) return null;
  if (!['instant', 'day', 'unknown'].includes(item.datePrecision)) return null;
  if (item.requiresReview !== true || item.deliveryEligible !== false)
    return null;
  return {
    id: item.id,
    sourceId: item.sourceId,
    sourceName: item.sourceName,
    title: item.title,
    url,
    language: ['en', 'es'].includes(item.language) ? item.language : 'und',
    publishedAt: item.publishedAt,
    datePrecision: item.datePrecision,
    detectedAt: item.detectedAt,
    media: newsMedia(item.media, item.sourceId),
    // Publisher metadata cannot establish event time, location or corroboration.
    eventAt: null,
  };
}

export function parseSnapshot(value) {
  if (
    !value ||
    value.version !== 1 ||
    value.mode !== 'published-news' ||
    !validTime(value.generatedAt) ||
    !Array.isArray(value.items) ||
    value.items.length > MAX_ITEMS ||
    !Array.isArray(value.sourceStatus) ||
    value.sourceStatus.length > 200
  )
    throw new Error('Invalid news snapshot');
  const seen = new Set();
  const items = value.items.map(newsItem).filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  const sourceStatus = value.sourceStatus
    .filter(
      (source) =>
        source &&
        text(source.id, 300) &&
        text(source.name, 300) &&
        text(source.status, 80) &&
        (source.lastSuccessAt === null || validTime(source.lastSuccessAt)) &&
        (source.lastAttemptAt === null || validTime(source.lastAttemptAt)),
    )
    .map(({ id, name, status, lastSuccessAt, lastAttemptAt }) => ({
      id,
      name,
      status,
      lastSuccessAt,
      lastAttemptAt,
    }));
  return {
    generatedAt: value.generatedAt,
    items,
    sourceStatus,
    omitted:
      value.items.length -
      items.length +
      value.sourceStatus.length -
      sourceStatus.length,
  };
}

export function snapshotStale(snapshot, now = Date.now()) {
  const age = now - Date.parse(snapshot.generatedAt);
  return age > 15 * 60 * 1000 || age < -5 * 60 * 1000;
}
