import { DatabaseSync, backup } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { open, link, unlink } from 'node:fs/promises';
import { producerKey } from './producer.mjs';
import { digest, PARSER_VERSION, requiredText } from './parsers/common.mjs';

export class Warehouse {
  constructor(root) {
    mkdirSync(root, { recursive: true });
    this.path = join(root, 'amparo.sqlite');
    this.db = new DatabaseSync(this.path);
    this.db.exec(
      readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'),
    );
  }

  close() {
    this.db.close();
  }

  begin(source) {
    const run = {
      id: randomUUID(),
      sourceId: source.id,
      startedAt: new Date().toISOString(),
      status: 'running',
      scope: source.scope,
      producerKey,
      sourceConfiguration: source,
      pages: 0,
      accepted: 0,
      rejected: 0,
      declaredTotal: null,
    };
    this.db
      .prepare('INSERT INTO runs VALUES (?, ?, ?, NULL, ?, ?)')
      .run(run.id, source.id, run.startedAt, run.status, JSON.stringify(run));
    return run;
  }

  saveCapture(run, response) {
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO captures VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)')
      .run(
        id,
        run.id,
        run.sourceId,
        response.url,
        response.fetchedAt,
        response.status,
        JSON.stringify(response.headers),
        digest(response.body),
        response.body,
      );
    return id;
  }

  reusableCapture(run, response) {
    const prior = this.db
      .prepare(
        `SELECT c.id,c.sha256,r.receipt_json
      FROM captures c JOIN runs r ON r.id=c.run_id
      WHERE c.source_id=? AND c.url=? AND c.status=200 AND c.error IS NULL
      AND r.status='complete' ORDER BY c.rowid DESC LIMIT 1`,
      )
      .get(run.sourceId, response.url);
    if (!prior || prior.sha256 !== digest(response.body)) return null;
    const receipt = JSON.parse(prior.receipt_json);
    if (
      receipt.producerKey !== run.producerKey ||
      receipt.pages !== 1 ||
      JSON.stringify(receipt.sourceConfiguration) !==
        JSON.stringify(run.sourceConfiguration)
    )
      return null;
    return {
      id: prior.id,
      accepted: receipt.accepted,
      declaredTotal: receipt.declaredTotal,
      coverage: receipt.coverage,
    };
  }

  captureError(id, error) {
    this.db
      .prepare('UPDATE captures SET error = ? WHERE id = ?')
      .run(error, id);
  }

  publish(run, pages) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const page of pages) this.savePage(run.sourceId, page);
      run.completedAt = new Date().toISOString();
      this.db
        .prepare(
          'UPDATE runs SET completed_at=?, status=?, receipt_json=? WHERE id=?',
        )
        .run(run.completedAt, run.status, JSON.stringify(run), run.id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  savePage(sourceId, page) {
    const versionStmt = this.db.prepare(
      'INSERT OR IGNORE INTO versions VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const itemStmt = this.db.prepare(`INSERT INTO items
      (id,source_id,external_id,version_id,kind,title,published_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET version_id=excluded.version_id,
      kind=excluded.kind,title=excluded.title,published_at=excluded.published_at,
      review_status=CASE WHEN items.version_id=excluded.version_id
      THEN items.review_status ELSE 'pending' END`);
    const occurrenceStmt = this.db.prepare(
      'INSERT INTO occurrences VALUES (?, ?, ?, ?)',
    );
    for (const row of page.records) {
      const id = digest(sourceId + '\n' + row.normalized.externalId);
      const sourceJson = JSON.stringify(row.sourceRecord);
      const versionId = digest(
        id +
          PARSER_VERSION +
          producerKey +
          sourceJson +
          JSON.stringify(row.normalized),
      );
      const payload = {
        ...row.normalized,
        id,
        versionId,
        captureId: page.captureId,
        ordinal: row.ordinal,
      };
      versionStmt.run(
        versionId,
        id,
        PARSER_VERSION + ':' + producerKey,
        page.captureId,
        row.ordinal,
        sourceJson,
        JSON.stringify(payload),
      );
      itemStmt.run(
        id,
        sourceId,
        payload.externalId,
        versionId,
        payload.kind,
        payload.title,
        payload.publishedAt,
      );
      occurrenceStmt.run(page.captureId, row.ordinal, id, versionId);
    }
    const quarantineStmt = this.db.prepare(
      'INSERT INTO quarantine VALUES (?, ?, ?, ?)',
    );
    for (const row of page.rejected)
      quarantineStmt.run(
        page.captureId,
        row.ordinal,
        row.reason,
        JSON.stringify(row.sourceRecord),
      );
  }

  items({ sourceId = '', kind = '', q = '', limit = 50, offset = 0 } = {}) {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw new Error('Invalid pagination');
    const predicate = `(?='' OR i.source_id=?) AND (?='' OR i.kind=?)
      AND (?='' OR instr(lower(i.title),lower(?))>0)`;
    const values = [sourceId, sourceId, kind, kind, q, q];
    const total = this.db
      .prepare(`SELECT count(*) AS n FROM items i WHERE ${predicate}`)
      .get(...values).n;
    const rows = this.db
      .prepare(
        `SELECT v.payload_json,i.review_status FROM items i
      JOIN versions v ON i.version_id=v.id WHERE ${predicate}
      ORDER BY i.published_at DESC,i.id LIMIT ? OFFSET ?`,
      )
      .all(...values, limit, offset);
    return {
      version: 1,
      mode: 'local-research',
      total,
      limit,
      offset,
      items: rows.map((r) => ({
        ...JSON.parse(r.payload_json),
        reviewStatus: r.review_status,
      })),
    };
  }

  item(id) {
    const row = this.db
      .prepare(
        `SELECT v.payload_json,i.review_status FROM items i
      JOIN versions v ON i.version_id=v.id WHERE i.id=?`,
      )
      .get(id);
    if (!row) throw new Error('Item not found');
    return { ...JSON.parse(row.payload_json), reviewStatus: row.review_status };
  }

  version(id) {
    const row = this.db.prepare('SELECT * FROM versions WHERE id=?').get(id);
    if (!row) throw new Error('Version not found');
    return {
      ...row,
      sourceRecord: JSON.parse(row.source_json),
      payload: JSON.parse(row.payload_json),
    };
  }

  capture(id) {
    const row = this.db.prepare('SELECT * FROM captures WHERE id=?').get(id);
    if (!row) throw new Error('Capture not found');
    return { ...row, body: Buffer.from(row.body) };
  }

  captures() {
    return this.db
      .prepare(
        'SELECT id,run_id,source_id,sha256,fetched_at,error FROM captures ORDER BY rowid',
      )
      .all();
  }

  runs() {
    return this.db
      .prepare('SELECT receipt_json FROM runs ORDER BY rowid DESC LIMIT 100')
      .all()
      .map((r) => JSON.parse(r.receipt_json));
  }

  review(id, decision, note, actor) {
    if (!['approved', 'rejected'].includes(decision))
      throw new Error('Invalid decision');
    requiredText(note, 'review note');
    requiredText(actor, 'reviewer');
    const item = this.item(id);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare('INSERT INTO reviews VALUES (?,?,?,?,?,?,?)')
        .run(
          randomUUID(),
          id,
          item.versionId,
          decision,
          note,
          actor,
          new Date().toISOString(),
        );
      this.db
        .prepare('UPDATE items SET review_status=? WHERE id=?')
        .run(decision, id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.item(id);
  }

  async backupTo(path) {
    const temporary = path + '.' + randomUUID() + '.tmp';
    await backup(this.db, temporary);
    try {
      const reader = new DatabaseSync(temporary, { readOnly: true });
      try {
        const result = reader.prepare('PRAGMA integrity_check').get();
        if (result.integrity_check !== 'ok')
          throw new Error('Backup integrity check failed');
      } finally {
        reader.close();
      }
      const file = await open(temporary, 'r+');
      try {
        await file.sync();
      } finally {
        await file.close();
      }
      await link(temporary, path);
    } finally {
      await unlink(temporary);
    }
  }
}
