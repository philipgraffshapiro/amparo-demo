import { createHash } from 'node:crypto';
import { parseTree } from 'jsonc-parser';

export const PARSER_VERSION = 'amparo-public-data/2';
export const digest = (value) =>
  createHash('sha256').update(value).digest('hex');

export function strictJson(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const errors = [];
  const tree = parseTree(text, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });
  if (errors.length || !tree) throw new Error('Invalid JSON document');
  checkTree(tree);
  return JSON.parse(text);
}

function checkTree(node, depth = 0) {
  if (depth > 50) throw new Error('JSON depth limit exceeded');
  if (node.type === 'object') {
    const keys = node.children.map((entry) => entry.children[0].value);
    if (new Set(keys).size !== keys.length)
      throw new Error('Duplicate JSON key');
  }
  if (node.type === 'number' && !Number.isFinite(node.value))
    throw new Error('Invalid JSON number');
  if (
    node.type === 'number' &&
    Number.isInteger(node.value) &&
    !Number.isSafeInteger(node.value)
  )
    throw new Error('Unsafe JSON integer');
  for (const child of node.children ?? []) checkTree(child, depth + 1);
}

export function requiredText(value, field, max = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Invalid ${field}`);
  return value.trim();
}

export function publicUrl(value) {
  const url = new URL(requiredText(value, 'URL', 4096));
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Invalid public URL');
  return url.href;
}

export function publicationDate(value, precision = 'instant') {
  if (value === null || value === undefined || value === '') return null;
  if (precision === 'day') {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw new Error('Invalid publication date');
    return value;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error('Invalid publication time');
  return date.toISOString();
}

export function record(source, raw, fields) {
  const externalId = requiredText(fields.externalId, 'source identifier', 4096);
  const normalized = {
    externalId,
    sourceId: source.id,
    kind: source.kind,
    title: requiredText(fields.title, 'title'),
    url: publicUrl(fields.url),
    publishedAt: publicationDate(fields.publishedAt, fields.datePrecision),
    datePrecision: fields.publishedAt
      ? (fields.datePrecision ?? 'instant')
      : 'unknown',
    observedAt: null,
    areaId: null,
    language: source.language ?? null,
    media: [],
    ...fields.extra,
  };
  return { normalized, sourceRecord: raw };
}
