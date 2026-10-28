import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const inputs = [
  'parsers/common.mjs',
  'parsers/api.mjs',
  'parsers/index.mjs',
  'parsers/rss.mjs',
  'parsers/media.mjs',
  'intake.mjs',
  'ingest.mjs',
  'warehouse.mjs',
  'sources.mjs',
  'schema.sql',
  '../package-lock.json',
];
const hash = createHash('sha256');
for (const path of inputs) {
  hash.update(path);
  hash.update(readFileSync(new URL(path, import.meta.url)));
}
export const producerKey = hash.digest('hex');
