import {
  strictJson,
  digest,
  requiredText,
  publicUrl,
  publicationDate,
} from './parsers/common.mjs';

const fields = new Set([
  'reportId',
  'consent',
  'reporterRef',
  'observedAt',
  'areaId',
  'type',
  'description',
  'reportedPeople',
  'evidenceUrls',
]);
export const intakeSource = {
  id: 'community-intake',
  scope: 'explicit-local-submission',
};

export function importReports(warehouse, bytes, { origin, now = new Date() }) {
  const url = new URL(origin);
  if (url.protocol !== 'file:')
    throw new Error('Local intake requires file provenance');
  if (bytes.length > 1024 * 1024) throw new Error('Intake byte limit exceeded');
  const run = warehouse.begin(intakeSource);
  const captureId = warehouse.saveCapture(run, {
    url: url.href,
    status: 200,
    fetchedAt: now.toISOString(),
    headers: { 'content-type': 'application/json' },
    body: bytes,
  });
  try {
    const payload = strictJson(bytes);
    if (
      payload.version !== 1 ||
      !Array.isArray(payload.reports) ||
      payload.reports.length > 100
    )
      throw new Error(
        'Intake schema requires version 1 and at most 100 reports',
      );
    const page = { captureId, records: [], rejected: [] };
    const ids = new Set();
    payload.reports.forEach((raw, ordinal) => {
      try {
        const normalized = normalizeReport(raw, now);
        if (ids.has(normalized.externalId))
          throw new Error('Duplicate report ID');
        ids.add(normalized.externalId);
        const id = digest(intakeSource.id + '\n' + normalized.externalId);
        const previous = warehouse.db
          .prepare('SELECT version_id FROM items WHERE id=?')
          .get(id);
        if (
          previous &&
          JSON.stringify(
            warehouse.version(previous.version_id).sourceRecord,
          ) !== JSON.stringify(raw)
        )
          throw new Error(
            'Idempotency key already used for different content; submit a correction for review',
          );
        page.records.push({ normalized, sourceRecord: raw, ordinal });
      } catch (error) {
        page.rejected.push({
          ordinal,
          sourceRecord: raw,
          reason: error.message,
        });
      }
    });
    Object.assign(run, {
      pages: 1,
      accepted: page.records.length,
      rejected: page.rejected.length,
      declaredTotal: payload.reports.length,
      coverage: 'submitted-batch',
      status: page.rejected.length ? 'partial' : 'complete',
    });
    warehouse.publish(run, [page]);
  } catch (error) {
    warehouse.captureError(captureId, error.message);
    Object.assign(run, { status: 'failed', error: error.message });
    warehouse.publish(run, []);
  }
  return run;
}

function normalizeReport(raw, now) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Invalid report');
  if (Object.keys(raw).some((key) => !fields.has(key)))
    throw new Error('Unknown report fields; use approximate area only');
  if (raw.consent !== true) throw new Error('Publication consent required');
  requiredText(raw.reporterRef, 'private reporter reference', 128);
  if (!/^US-\d{5}$/.test(raw.areaId))
    throw new Error('County FIPS area required');
  if (!['presence', 'detention', 'advisory'].includes(raw.type))
    throw new Error('Unknown report type');
  if (
    typeof raw.observedAt !== 'string' ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(raw.observedAt)
  )
    throw new Error('Observation timezone required');
  const observedAt = publicationDate(raw.observedAt);
  if (!observedAt || Date.parse(observedAt) > now.getTime() + 300000)
    throw new Error('Observation is missing or in the future');
  if (
    raw.reportedPeople !== null &&
    (!Number.isInteger(raw.reportedPeople) ||
      raw.reportedPeople < 0 ||
      raw.reportedPeople > 10000)
  )
    throw new Error('Invalid reported-person count');
  if (!Array.isArray(raw.evidenceUrls) || raw.evidenceUrls.length > 5)
    throw new Error('At most five evidence links');
  const evidenceUrls = raw.evidenceUrls.map(publicUrl);
  return {
    externalId: requiredText(raw.reportId, 'report ID', 128),
    sourceId: intakeSource.id,
    kind: 'community_report',
    title: requiredText(raw.description, 'report description'),
    url: evidenceUrls[0] ?? null,
    publishedAt: null,
    datePrecision: 'unknown',
    observedAt,
    areaId: raw.areaId,
    language: null,
    media: [],
    reportType: raw.type,
    reportedPeople: raw.reportedPeople,
    evidenceUrls,
  };
}
