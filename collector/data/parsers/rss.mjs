import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { record, publicUrl } from './common.mjs';
import { JSDOM } from 'jsdom';
import { isIP } from 'node:net';

const asArray = (value) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value) => (typeof value === 'object' ? value?.['#text'] : value);

function plain(value, limit = 1000) {
  const input = text(value);
  if (typeof input !== 'string') return '';
  return JSDOM.fragment(input).textContent.trim().slice(0, limit);
}

function imageURL(value, base) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096)
    return null;
  try {
    const url = new URL(plain(value, 4096), base);
    const host = url.hostname;
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !host.includes('.') ||
      host.endsWith('.local') ||
      isIP(host.replaceAll('[', '').replaceAll(']', ''))
    )
      return null;
    return publicUrl(url.href);
  } catch {
    return null;
  }
}

function publisherMedia(raw, base) {
  const candidates = [];
  const add = (node, provenance) => candidates.push({ node, provenance });
  for (const node of asArray(raw.enclosure))
    if (node?.['@_type']?.startsWith('image/')) add(node, 'rss-enclosure');
  const contents = [
    ...asArray(raw['media:content']),
    ...asArray(raw['media:group']).flatMap((group) =>
      asArray(group?.['media:content']),
    ),
  ];
  for (const node of contents) {
    if (
      node &&
      !node['@_type']?.startsWith('video/') &&
      node['@_medium'] !== 'video' &&
      (node['@_medium'] === 'image' || node['@_type']?.startsWith('image/'))
    )
      add(node, 'rss-media-content');
  }
  for (const node of asArray(raw['media:thumbnail']))
    add(node, 'rss-media-thumbnail');
  const html =
    text(raw['content:encoded']) || text(raw.description) || text(raw.summary);
  candidates.push(...articleImages(html));
  const result = [],
    seen = new Set();
  for (const { node, provenance } of candidates) {
    if (
      !node ||
      ['@_width', '@_height'].some((key) => node[key] && Number(node[key]) <= 2)
    )
      continue;
    const url = imageURL(node['@_url'], base);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const alt = plain(node['media:title']),
      credit = plain(node['media:credit']);
    result.push({
      url,
      reuseStatus: 'permission-required',
      provenance,
      ...(alt ? { alt } : {}),
      ...(credit ? { credit } : {}),
    });
    if (result.length === 5) break;
  }
  return result;
}

function articleImages(html) {
  const images = [];
  if (typeof html === 'string') {
    const document = new JSDOM(html).window.document;
    for (const img of document.images) {
      if (
        img.hidden ||
        img.style.display === 'none' ||
        img.style.visibility === 'hidden'
      )
        continue;
      images.push({
        node: {
          '@_url': img.getAttribute('src'),
          '@_width': img.getAttribute('width'),
          '@_height': img.getAttribute('height'),
          'media:title': img.getAttribute('alt'),
          'media:credit': img.closest('figure')?.querySelector('figcaption')
            ?.textContent,
        },
        provenance: 'rss-content-image',
      });
    }
    document.defaultView.close();
  }
  return images;
}

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
      const media = publisherMedia(raw, link);
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
