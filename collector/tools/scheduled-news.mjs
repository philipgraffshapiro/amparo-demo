import { mkdir, open, rename, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Warehouse } from '../data/warehouse.mjs';
import { newsSources } from '../data/news-sources.mjs';
import { runCycle } from '../data/orchestrator.mjs';
import { newsSnapshot } from '../data/news-export.mjs';
import { verifyWarehouse } from './data-readback.mjs';
import { parseSnapshot } from '../public/news/model.js';

// This separate warehouse contains publisher feeds only. Never upload the
// development warehouse, which can also hold private reports or subscriptions.
function assertPublicState(warehouse) {
  const sources = warehouse.db
    .prepare('SELECT DISTINCT source_id FROM runs')
    .all();
  const allowed = new Set(newsSources.map((source) => source.id));
  if (sources.some((source) => !allowed.has(source.source_id)))
    throw new Error('Scheduled news state contains another source');
  for (const table of [
    'subscriptions',
    'outbox',
    'reviews',
    'source_releases',
  ]) {
    if (warehouse.db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get())
      throw new Error(
        'Scheduled news state contains private or unrelated data',
      );
  }
}

export async function collectNews({
  root,
  output,
  backup,
  now = new Date(),
  client,
} = {}) {
  const warehouse = new Warehouse(root);
  try {
    assertPublicState(warehouse);
    const cycle = await runCycle(warehouse, {
      configured: newsSources,
      now,
      ...(client ? { client } : {}),
    });
    const proof = verifyWarehouse(warehouse);
    if (!proof.passed) throw new Error('Independent news readback failed');
    const snapshot = newsSnapshot(warehouse, now);
    if (!snapshot.sourceStatus.some((source) => source.lastSuccessAt))
      throw new Error(
        'No successful source has been collected; publication held',
      );
    const bytes = JSON.stringify(snapshot, null, 2) + '\n';
    if (Buffer.byteLength(bytes) > 1024 * 1024)
      throw new Error('News snapshot exceeds size limit');
    await mkdir(dirname(output), { recursive: true });
    await mkdir(dirname(backup), { recursive: true });
    await warehouse.backupTo(backup);
    const temporary = output + '.part';
    const file = await open(temporary, 'w');
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    const reread = parseSnapshot(JSON.parse(await readFile(temporary, 'utf8')));
    if (reread.omitted || reread.items.length !== snapshot.items.length)
      throw new Error('Published news readback failed');
    await rename(temporary, output);
    return {
      generatedAt: snapshot.generatedAt,
      items: snapshot.items.length,
      sources: snapshot.sourceStatus.length,
      degraded: snapshot.sourceStatus.some((source) => source.status !== 'ok'),
      results: cycle.sources.map(({ sourceId, status }) => ({
        sourceId,
        status,
      })),
      proof,
    };
  } finally {
    warehouse.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = await collectNews({
      root: process.env.AMPARO_NEWS_ROOT || '.state',
      output: process.env.AMPARO_NEWS_OUTPUT || 'public/data/news.json',
      backup: process.env.AMPARO_NEWS_BACKUP || '.state-backup/amparo.sqlite',
    });
    console.log(JSON.stringify(result));
    // Publication remains usable during partial outages; the workflow reports
    // degradation after deploying the visible per-source failure state.
    if (process.env.GITHUB_OUTPUT) {
      const output = await open(process.env.GITHUB_OUTPUT, 'a');
      try {
        await output.writeFile(`degraded=${result.degraded}\n`);
      } finally {
        await output.close();
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
