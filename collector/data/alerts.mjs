import { randomUUID } from 'node:crypto';
import { requiredText } from './parsers/common.mjs';

export class AlertQueue {
  constructor(warehouse) {
    this.warehouse = warehouse;
    this.db = warehouse.db;
  }

  subscribe({ ownerId, topic, areaId = null, consent }) {
    requiredText(ownerId, 'owner ID', 128);
    if (consent !== true) throw new Error('Explicit consent is required');
    if (!['news', 'policy', 'community_report'].includes(topic))
      throw new Error('Invalid topic');
    if (areaId !== null && !/^US-\d{5}$/.test(areaId))
      throw new Error('Invalid county area ID');
    const sub = {
      id: randomUUID(),
      ownerId,
      topic,
      areaId,
      consentAt: new Date().toISOString(),
      active: true,
    };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db
        .prepare(
          'SELECT * FROM subscriptions WHERE owner_id=? AND topic=? AND area_id IS ? AND active=1 ORDER BY consent_at LIMIT 1',
        )
        .get(ownerId, topic, areaId);
      if (existing) {
        sub.id = existing.id;
        sub.consentAt = existing.consent_at;
      } else {
        this.db
          .prepare('INSERT INTO subscriptions VALUES (?,?,?,?,?,1)')
          .run(sub.id, ownerId, topic, areaId, sub.consentAt);
      }
      this.db.exec('COMMIT');
      return sub;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  subscriptions(ownerId) {
    return this.db
      .prepare('SELECT * FROM subscriptions WHERE owner_id=?')
      .all(ownerId)
      .map((s) => ({
        id: s.id,
        ownerId: s.owner_id,
        topic: s.topic,
        areaId: s.area_id,
        consentAt: s.consent_at,
        active: Boolean(s.active),
      }));
  }

  unsubscribe(id, ownerId) {
    const sub = this.db
      .prepare('SELECT owner_id FROM subscriptions WHERE id=?')
      .get(id);
    if (!sub || sub.owner_id !== ownerId)
      throw new Error('Subscription owner mismatch');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('UPDATE subscriptions SET active=0 WHERE id=?').run(id);
      this.db
        .prepare(
          "UPDATE outbox SET status='cancelled' WHERE subscription_id=? AND status='queued-local'",
        )
        .run(id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  prepare({ enabled = false, now = new Date() } = {}) {
    if (!enabled) return 0;
    const rows = this.db
      .prepare(
        `SELECT i.id,i.kind,i.version_id,v.payload_json,s.id AS subscription_id
      FROM items i JOIN versions v ON i.version_id=v.id
      JOIN subscriptions s ON s.topic=i.kind
      WHERE i.review_status='approved' AND s.active=1
      AND (s.area_id IS NULL OR s.area_id=json_extract(v.payload_json,'$.areaId'))
      ORDER BY i.id,s.id LIMIT 1001`,
      )
      .all();
    if (rows.length > 1000)
      throw new Error(
        'Queue batch exceeds 1000; partition subscriptions before scaling',
      );
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO outbox VALUES (?,?,?,?,?,?,?)',
    );
    let added = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.cancelInvalid(now);
      for (const row of rows) {
        const item = JSON.parse(row.payload_json);
        const timestamp = Date.parse(item.observedAt ?? item.publishedAt);
        const age = now.getTime() - timestamp;
        const maxAge =
          row.kind === 'community_report' ? 2 * 3600000 : 7 * 86400000;
        if (!Number.isFinite(age) || age < -300000 || age > maxAge) continue;
        const payload = {
          version: 1,
          itemId: item.id,
          versionId: item.versionId,
          title: item.title,
          url: item.url,
          areaId: item.areaId,
          alertClass: row.kind === 'policy' ? 'policy-update' : row.kind,
          dispatch: false,
          expiresAt: new Date(timestamp + maxAge).toISOString(),
        };
        added += Number(
          insert.run(
            randomUUID(),
            row.subscription_id,
            item.id,
            item.versionId,
            'queued-local',
            now.toISOString(),
            JSON.stringify(payload),
          ).changes,
        );
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return added;
  }

  cancelInvalid(now = new Date()) {
    this.db
      .prepare(
        `UPDATE outbox SET status='cancelled' WHERE status='queued-local' AND
      (NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.id=outbox.subscription_id AND s.active=1)
      OR NOT EXISTS (SELECT 1 FROM items i WHERE i.id=outbox.item_id
      AND i.version_id=outbox.version_id AND i.review_status='approved')
      OR julianday(json_extract(payload_json,'$.expiresAt')) IS NULL
      OR julianday(json_extract(payload_json,'$.expiresAt')) <= julianday(?))`,
      )
      .run(now.toISOString());
  }

  outbox({ now = new Date() } = {}) {
    this.cancelInvalid(now);
    return this.db
      .prepare('SELECT * FROM outbox ORDER BY created_at LIMIT 1000')
      .all()
      .map((r) => ({
        id: r.id,
        subscriptionId: r.subscription_id,
        status: r.status,
        createdAt: r.created_at,
        payload: JSON.parse(r.payload_json),
      }));
  }
}
