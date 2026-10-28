import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { sourceRows, expectedItem } from './data-readback-source.mjs';

export function verifyWarehouse(warehouse) {
  const issues = [];
  let checked = 0;
  let unpublishedCaptures = 0;
  let captureCount = 0;
  const captures = warehouse.db
    .prepare(
      `SELECT c.*,r.status AS run_status,r.receipt_json FROM captures c
    JOIN runs r ON c.run_id=r.id ORDER BY c.rowid`,
    )
    .iterate();
  for (const capture of captures) {
    captureCount++;
    const bytes = Buffer.from(capture.body);
    if (createHash('sha256').update(bytes).digest('hex') !== capture.sha256)
      issues.push({ captureId: capture.id, error: 'raw byte hash mismatch' });
    if (
      !['complete', 'partial'].includes(capture.run_status) ||
      capture.error
    ) {
      unpublishedCaptures++;
      continue;
    }
    try {
      checked += verifyCapture(warehouse, capture, bytes, issues);
    } catch (error) {
      issues.push({ captureId: capture.id, error: error.message });
    }
  }
  verifyCurrentItems(warehouse, issues);
  const integrity = warehouse.db.prepare('PRAGMA integrity_check').get();
  if (integrity.integrity_check !== 'ok')
    issues.push({ error: 'SQLite integrity failure' });
  if (warehouse.db.prepare('PRAGMA foreign_key_check').all().length)
    issues.push({ error: 'Foreign key failure' });
  return {
    passed: issues.length === 0,
    coverage: 'ALL_COMMITTED_OCCURRENCES_AND_CURRENT_ITEMS',
    captures: captureCount,
    checkedOccurrences: checked,
    unpublishedCaptures,
    currentItems: warehouse.items({ limit: 1 }).total,
    issues,
    reader:
      'native JSON + independent XML DOM; no production normalizer imports',
  };
}

function verifyCapture(warehouse, capture, bytes, issues) {
  const source = JSON.parse(capture.receipt_json).sourceConfiguration ?? {};
  if (source.id && source.id !== capture.source_id)
    throw new Error('Captured source configuration identity differs');
  const rows = sourceRows(capture.source_id, bytes, source);
  if (!Array.isArray(rows)) throw new Error('Source records missing');
  const stored = warehouse.db
    .prepare(
      `SELECT o.ordinal AS occurrence_ordinal,v.* FROM occurrences o
    JOIN versions v ON o.version_id=v.id WHERE o.capture_id=? ORDER BY o.ordinal`,
    )
    .all(capture.id);
  const rejected = warehouse.db
    .prepare('SELECT ordinal,source_json FROM quarantine WHERE capture_id=?')
    .all(capture.id);
  const ordinals = [
    ...stored.map((r) => r.occurrence_ordinal),
    ...rejected.map((r) => r.ordinal),
  ].sort((a, b) => a - b);
  if (
    !isDeepStrictEqual(
      ordinals,
      rows.map((r, i) => i),
    )
  )
    issues.push({
      captureId: capture.id,
      error: 'Missing, extra or duplicate source occurrence',
    });
  for (const row of rejected)
    if (!isDeepStrictEqual(JSON.parse(row.source_json), rows[row.ordinal]))
      issues.push({
        captureId: capture.id,
        ordinal: row.ordinal,
        error: 'Quarantine source mismatch',
      });
  for (const row of stored) {
    const original = rows[row.occurrence_ordinal];
    if (!isDeepStrictEqual(JSON.parse(row.source_json), original))
      issues.push({
        captureId: capture.id,
        ordinal: row.ordinal,
        error: 'Full source record differs',
      });
    const expected = {
      ...expectedItem(
        capture.source_id,
        original,
        bytes,
        source,
        row.parser_version,
      ),
      id: row.item_id,
      versionId: row.id,
      captureId: row.capture_id,
      ordinal: row.ordinal,
    };
    if (!isDeepStrictEqual(JSON.parse(row.payload_json), expected))
      issues.push({
        captureId: capture.id,
        ordinal: row.ordinal,
        error: 'Normalized values differ from source',
      });
  }
  return stored.length;
}

function verifyCurrentItems(warehouse, issues) {
  verifyCurrentPopulation(warehouse, issues);
  const rows = warehouse.db
    .prepare(
      `SELECT i.*,v.payload_json FROM items i
    JOIN versions v ON i.version_id=v.id`,
    )
    .all();
  for (const row of rows) {
    const payload = JSON.parse(row.payload_json);
    if (
      row.id !== payload.id ||
      row.source_id !== payload.sourceId ||
      row.external_id !== payload.externalId ||
      row.title !== payload.title ||
      row.kind !== payload.kind ||
      row.published_at !== payload.publishedAt
    )
      issues.push({
        itemId: row.id,
        error: 'Current consumer columns disagree with version',
      });
    if (
      !warehouse.db
        .prepare('SELECT 1 FROM occurrences WHERE version_id=? LIMIT 1')
        .get(row.version_id)
    )
      issues.push({
        itemId: row.id,
        error: 'Current record has no source occurrence',
      });
  }
}

function verifyCurrentPopulation(warehouse, issues) {
  const committed = warehouse.db
    .prepare(
      `SELECT o.item_id,o.version_id FROM occurrences o
     JOIN captures c ON c.id=o.capture_id JOIN runs r ON r.id=c.run_id
     WHERE r.status IN ('complete','partial') AND c.error IS NULL
     ORDER BY o.rowid`,
    )
    .all();
  const expected = new Map(committed.map((r) => [r.item_id, r.version_id]));
  const actual = new Map(
    warehouse.db
      .prepare('SELECT id,version_id FROM items')
      .all()
      .map((r) => [r.id, r.version_id]),
  );
  for (const id of new Set([...expected.keys(), ...actual.keys()])) {
    if (expected.get(id) !== actual.get(id))
      issues.push({
        itemId: id,
        error: 'Current population differs from latest committed occurrences',
        expectedVersion: expected.get(id) ?? null,
        actualVersion: actual.get(id) ?? null,
      });
  }
}
