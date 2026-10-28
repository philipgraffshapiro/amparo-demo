import { sourceUrl } from './sources.mjs';
import { parsePage } from './parsers/index.mjs';

export async function ingest(
  warehouse,
  source,
  { client, maxPages = source.maxPages, initialUrl, replayOf } = {},
) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10)
    throw new Error('Page budget must be 1..10');
  if (!source.enabled) throw new Error(`Source disabled: ${source.id}`);
  const run = warehouse.begin(source);
  if (replayOf) run.replayOf = replayOf;
  const pages = [];
  const seen = new Set();
  let url = initialUrl ?? sourceUrl(source);
  let captureId;
  try {
    while (url && run.pages < maxPages) {
      const target = new URL(url);
      if (
        target.protocol !== 'https:' ||
        !source.hosts.includes(target.hostname)
      )
        throw new Error('Source pagination host not allowed');
      const response = await client.get(url, source);
      const reuse =
        source.lane === 'fast-news' && maxPages === 1 && response.status === 200
          ? warehouse.reusableCapture(run, response)
          : null;
      if (reuse) {
        Object.assign(run, {
          status: 'complete',
          pages: 1,
          accepted: reuse.accepted,
          declaredTotal: reuse.declaredTotal,
          coverage: reuse.coverage,
          reusedCaptureId: reuse.id,
          reusedFetchedAt: response.fetchedAt,
          responseHeaders: response.headers,
        });
        warehouse.publish(run, []);
        return run;
      }
      captureId = warehouse.saveCapture(run, response);
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const page = parsePage(source, response.body, response.url);
      if (pages.length && page.declaredTotal !== run.declaredTotal)
        throw new Error('Source count changed during pagination');
      for (const row of page.records) {
        if (seen.has(row.normalized.externalId))
          throw new Error('Duplicate source ID across pages');
        seen.add(row.normalized.externalId);
      }
      pages.push({ ...page, captureId });
      run.pages += 1;
      run.accepted += page.records.length;
      run.rejected += page.rejected.length;
      run.declaredTotal = page.declaredTotal;
      run.coverage = page.coverage;
      url = page.next;
    }
    finishCoverage(run, pages, url);
    warehouse.publish(run, pages);
  } catch (error) {
    if (error.response) captureId = warehouse.saveCapture(run, error.response);
    if (captureId) warehouse.captureError(captureId, error.message);
    run.status = 'failed';
    run.error = error.message;
    run.accepted = 0;
    warehouse.publish(run, []);
  }
  return run;
}

function finishCoverage(run, pages, nextUrl) {
  if (
    !nextUrl &&
    ['query-window', 'title-query-history'].includes(run.coverage) &&
    run.accepted + run.rejected !== run.declaredTotal
  )
    throw new Error('Source count does not reconcile with complete pagination');
  run.status =
    nextUrl || run.rejected || pages.some((page) => page.capped)
      ? 'partial'
      : 'complete';
  run.nextUrl = nextUrl;
}
