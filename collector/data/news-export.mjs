import { newsSignals } from './news-signals.mjs';
import { newsSources } from './news-sources.mjs';
import { parseSnapshot } from '../public/news/model.js';

export function newsSnapshot(warehouse, now = new Date()) {
  const items = [];
  const allowed = new Set(newsSources.map((source) => source.id));
  let page;
  for (let offset = 0; offset < 1000; offset += 100) {
    page = newsSignals(warehouse, { hours: 48, limit: 100, offset, now });
    items.push(...page.items.filter((item) => allowed.has(item.sourceId)));
    if (offset + 100 >= page.total) break;
  }
  if (page.total > 1000) throw new Error('News snapshot capacity exceeded');
  const jobs = warehouse.db.prepare('SELECT * FROM source_jobs').all();
  const snapshot = {
    version: 1,
    mode: 'published-news',
    generatedAt: now.toISOString(),
    sourceStatus: newsSources.map((source) => {
      const job = jobs.find((entry) => entry.source_id === source.id);
      const status =
        job?.status === 'failed'
          ? 'failed'
          : !job?.last_success_at
            ? 'unknown'
            : now.getTime() - Date.parse(job.last_success_at) > 15 * 60000
              ? 'stale'
              : 'ok';
      return {
        id: source.id,
        name: source.name,
        status,
        lastAttemptAt: job?.last_attempt_at ?? null,
        lastSuccessAt: job?.last_success_at ?? null,
      };
    }),
    items: items.map((item) => ({
      id: item.id,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      title: item.title,
      url: item.url,
      language: item.language,
      media: item.media,
      publishedAt: item.publishedAt,
      datePrecision: item.datePrecision,
      detectedAt: item.detectedAt,
      eventAt: null,
      requiresReview: true,
      deliveryEligible: false,
    })),
  };
  const parsed = parseSnapshot(snapshot);
  if (parsed.omitted)
    throw new Error('Invalid publisher metadata; export held');
  return snapshot;
}
