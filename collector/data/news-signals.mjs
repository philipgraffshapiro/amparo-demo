import { sources } from './sources.mjs';

// Topic matching over publisher text, not an incident classifier or HTML parser.
const immigration =
  /\b(?:immigrat\w*|inmigra\w*|migratori[oa]s?|migrants?|asylum|asilo|deport\w*|border patrol|patrulla fronteriza|redadas?)\b/iu;
const enforcement =
  /\bICE\b.{0,100}\b(?:agents?|agentes?|arrest\w*|detain\w*|deteni\w*|raids?|operati\w*)\b/iu;
const bySource = new Map(sources.map((source) => [source.id, source]));

function relevant(text) {
  return immigration.test(text) || enforcement.test(text);
}

function publisherText(raw) {
  return ['description', 'summary', 'content:encoded', 'content', 'abstract']
    .map((key) => raw[key])
    .map((value) =>
      typeof value === 'string' ? value : (value?.['#text'] ?? ''),
    )
    .filter((value) => typeof value === 'string')
    .join('\n');
}

function candidate(row, now) {
  const item = JSON.parse(row.payload_json);
  const matchedOn = relevant(item.title)
    ? 'headline'
    : relevant(publisherText(JSON.parse(row.source_json)))
      ? 'publisher-text'
      : null;
  if (!matchedOn) return null;
  const source = bySource.get(item.sourceId);
  const publication =
    item.publishedAt === null ? NaN : Date.parse(item.publishedAt);
  const freshness = !Number.isFinite(publication)
    ? 'unknown'
    : publication > now
      ? 'future-timestamp'
      : 'within-publication-window';
  return {
    id: row.id,
    versionId: row.version_id,
    externalId: item.externalId,
    sourceId: item.sourceId,
    sourceName: source?.name ?? item.sourceId,
    publisherGroup: source?.publisherGroup ?? null,
    title: item.title,
    url: item.url,
    language: item.language,
    publishedAt: item.publishedAt,
    datePrecision: item.datePrecision,
    detectedAt: row.fetched_at,
    eventAt: null,
    areaId: null,
    freshness,
    matchedOn,
    reviewStatus: row.review_status,
    requiresReview: true,
    deliveryEligible: false,
    independentCorroboration: 'not-assessed',
  };
}

export function newsSignals(
  warehouse,
  { hours = 48, limit = 50, offset = 0, now = new Date() } = {},
) {
  if (
    !Number.isInteger(hours) ||
    hours < 1 ||
    hours > 720 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100000 ||
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  )
    throw new Error('Invalid news window or pagination');
  const since = new Date(now.getTime() - hours * 3600000).toISOString();
  const rows = warehouse.db
    .prepare(
      `
    SELECT i.id,i.version_id,i.review_status,v.payload_json,v.source_json,c.fetched_at
    FROM items i JOIN versions v ON v.id=i.version_id
    JOIN captures c ON c.id=v.capture_id
    WHERE i.kind='news' AND (i.published_at IS NULL OR i.published_at>=?)
    ORDER BY COALESCE(i.published_at,c.fetched_at) DESC,i.id
  `,
    )
    .iterate(since);
  const items = [];
  let total = 0;
  let scanned = 0;
  for (const row of rows) {
    scanned++;
    const item = candidate(row, now.getTime());
    if (!item) continue;
    if (total >= offset && items.length < limit) items.push(item);
    total++;
  }
  return {
    version: 1,
    mode: 'local-news-review',
    hours,
    since,
    total,
    scanned,
    limit,
    offset,
    items,
    selection:
      'English/Spanish topic matches in headline and publisher-supplied text; recall is not guaranteed',
    timeMeaning:
      'Publication and detection times do not establish when the reported event occurred',
    dispatched: false,
  };
}
