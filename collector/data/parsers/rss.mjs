import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { record, publicUrl } from './common.mjs';

const asArray = (value) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value) => (typeof value === 'object' ? value?.['#text'] : value);

export function rss(source, bytes) {
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (
    xml.toUpperCase().includes('<!DOCTYPE') ||
    xml.toUpperCase().includes('<!ENTITY')
  )
    throw new Error('XML DOCTYPE/entities are not admitted');
  const validation = XMLValidator.validate(xml);
  if (validation !== true)
    throw new Error('Invalid XML: ' + validation.err.msg);
  const parsed = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    processEntities: true,
    htmlEntities: true,
    trimValues: true,
  }).parse(xml);
  const atom = Boolean(parsed.feed);
  if (!parsed.rss?.channel && !atom) throw new Error('RSS/Atom root missing');
  const rows = asArray(atom ? parsed.feed.entry : parsed.rss.channel.item);
  return {
    rows,
    next: null,
    declaredTotal: rows.length,
    coverage: 'publisher-feed-snapshot',
    convert: (raw) => {
      const link = atom
        ? asArray(raw.link).find(
            (r) => !r['@_rel'] || r['@_rel'] === 'alternate',
          )?.['@_href']
        : text(raw.link);
      const media = asArray(raw.enclosure)
        .filter((r) => r['@_type']?.startsWith('image/'))
        .map((r) => ({
          url: publicUrl(r['@_url']),
          reuseStatus: 'permission-required',
        }));
      return record(source, raw, {
        externalId: text(raw.guid ?? raw.id) ?? link,
        title: text(raw.title),
        url: link,
        publishedAt: text(raw.pubDate ?? raw.published ?? raw.updated) ?? null,
        extra: { media },
      });
    },
  };
}
