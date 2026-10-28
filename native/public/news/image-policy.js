const hostsBySource = new Map([
  ['block-club', ['i0.wp.com']],
  ['calmatters', ['i0.wp.com']],
  ['texas-tribune', ['i0.wp.com']],
  ['democracy-now', ['www.democracynow.org']],
  ['documented', ['documentedny.com']],
  ['ice-news', ['edit.ice.gov', 'www.ice.gov']],
  ['local10', ['www.local10.com']],
  ['minnesota-reformer', ['minnesotareformer.com']],
  ['nbc-chicago', ['media.nbcchicago.com']],
  ['nbc-miami', ['media.nbcmiami.com']],
  ['pbs-newshour', ['d3i6fh83elv35t.cloudfront.net']],
  ['wsvn', ['wsvn.com']],
  ['wlrn', ['npr.brightspotcdn.com']],
  ['telemundo51', ['media.telemundo51.com']],
]);

export const newsImageHosts = [...new Set([...hostsBySource.values()].flat())];

function imageURL(value, sourceId) {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      hostsBySource.get(sourceId)?.includes(url.hostname) &&
      !url.pathname.toLowerCase().endsWith('.svg')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const label = (value, max) =>
  typeof value === 'string' && value.length <= max ? value.trim() : '';

const provenance = new Set([
  'rss-enclosure',
  'rss-media-content',
  'rss-media-thumbnail',
  'rss-content-image',
]);

export function newsMedia(entries, sourceId) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  return entries.slice(0, 12).flatMap((entry) => {
    if (
      entry?.reuseStatus !== 'permission-required' ||
      !provenance.has(entry.provenance)
    )
      return [];
    const url = imageURL(entry?.url, sourceId);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [
      {
        url,
        reuseStatus: 'permission-required',
        alt: label(entry.alt, 1000),
        credit: label(entry.credit, 500),
        provenance: entry.provenance,
      },
    ];
  });
}
