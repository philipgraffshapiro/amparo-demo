import { randomUUID } from 'node:crypto';
import { sources } from './sources.mjs';
import { HttpClient } from './http.mjs';
import { ingest } from './ingest.mjs';
import { AlertQueue } from './alerts.mjs';

export function setupStatus(warehouse, { env = process.env } = {}) {
  return {
    mode: 'local-operations',
    local: {
      database: warehouse.path,
      records: warehouse.items({ limit: 1 }).total,
    },
    sources: sources.map((source) => ({
      id: source.id,
      configured: !source.requiresEnv || Boolean(env[source.requiresEnv]),
      pollMinutes: source.pollMinutes,
      missing:
        source.requiresEnv && !env[source.requiresEnv]
          ? source.requiresEnv
          : null,
    })),
    jobs: warehouse.db
      .prepare('SELECT * FROM source_jobs ORDER BY source_id')
      .all(),
    cloud: {
      configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
      verified: false,
    },
    delivery: {
      enabled: false,
      providers: ['in-app', 'push', 'email', 'sms'],
      requires: [
        'opt-in recipient',
        'approved current report version',
        'provider credentials',
        'delivery receipt',
      ],
    },
    scheduler: {
      installed: false,
      command: 'node --env-file=data/.env data/cli.mjs cycle',
      recommendedIntervalSeconds: 60,
    },
  };
}

function claimCycle(db, now) {
  const owner = randomUUID();
  const expiresAt = new Date(now.getTime() + 180000).toISOString();
  const result = db
    .prepare(
      `INSERT INTO operation_locks(name,owner,expires_at) VALUES ('source-cycle',?,?)
    ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at
    WHERE operation_locks.expires_at < ?`,
    )
    .run(owner, expiresAt, now.toISOString());
  if (!result.changes)
    throw new Error('A source cycle already owns the warehouse');
  return owner;
}

function dueState(db, source, now, env) {
  if (!source.enabled) return 'disabled';
  if (source.requiresEnv && !env[source.requiresEnv]) return 'needs-key';
  const previous = db
    .prepare('SELECT * FROM source_jobs WHERE source_id=?')
    .get(source.id);
  if (previous?.next_run_at > now.toISOString())
    return previous.status === 'failed' ? 'backoff' : 'not-due';
  return null;
}

async function executeSource(warehouse, source, options) {
  const { now, client, ingestSource } = options;
  const db = warehouse.db;
  const previous = db
    .prepare('SELECT * FROM source_jobs WHERE source_id=?')
    .get(source.id);
  db.prepare(
    `INSERT INTO source_jobs(source_id,status,attempts,last_attempt_at,next_run_at) VALUES (?,'running',0,?,?)
    ON CONFLICT(source_id) DO UPDATE SET status='running',last_attempt_at=excluded.last_attempt_at,next_run_at=excluded.next_run_at`,
  ).run(
    source.id,
    now.toISOString(),
    new Date(now.getTime() + 180000).toISOString(),
  );
  let result;
  try {
    result = await ingestSource(warehouse, source, { client });
  } catch {
    result = {
      sourceId: source.id,
      status: 'failed',
      error:
        'Source import failed; captured diagnostics remain in the source run.',
    };
  }
  const failed = result.status === 'failed';
  const attempts = failed ? (previous?.attempts ?? 0) + 1 : 0;
  const delayMs = failed
    ? Math.min(3600000, 60000 * 2 ** Math.min(attempts - 1, 6))
    : source.pollMinutes * 60000;
  db.prepare(
    `UPDATE source_jobs SET status=?,attempts=?,next_run_at=?,last_success_at=?,last_result_json=? WHERE source_id=?`,
  ).run(
    result.status,
    attempts,
    new Date(now.getTime() + delayMs).toISOString(),
    failed ? (previous?.last_success_at ?? null) : now.toISOString(),
    JSON.stringify(result),
    source.id,
  );
  return result;
}

export async function runCycle(
  warehouse,
  {
    configured = sources,
    now = new Date(),
    env = process.env,
    client = new HttpClient({ deadlineMs: 120000, maxRequests: 30 }),
    ingestSource = ingest,
    prepareAlerts = false,
  } = {},
) {
  const owner = claimCycle(warehouse.db, now);
  try {
    const results = [];
    for (const source of configured) {
      const status = dueState(warehouse.db, source, now, env);
      results.push(
        status
          ? { sourceId: source.id, status }
          : await executeSource(warehouse, source, {
              now,
              client,
              ingestSource,
            }),
      );
    }
    const queued = new AlertQueue(warehouse).prepare({
      enabled: prepareAlerts,
      now,
    });
    return {
      version: 1,
      sources: results,
      queued,
      dispatched: false,
      completedAt: new Date().toISOString(),
    };
  } finally {
    warehouse.db
      .prepare(
        "DELETE FROM operation_locks WHERE name='source-cycle' AND owner=?",
      )
      .run(owner);
  }
}
