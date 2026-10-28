// Independent reader: no production parser or normalizer imports.
import { JSDOM } from 'jsdom';
import { isIP } from 'node:net';

const one = (value) => (typeof value === 'object' ? value?.['#text'] : value);
const list = (value) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export function sourceRows(sourceId, bytes, source = {}) {
  if (
    source.parser === 'rss' ||
    ['immigration-impact', 'florida-phoenix'].includes(sourceId)
  ) {
    const dom = new JSDOM(bytes.toString('utf8'), {
      contentType: 'application/xml',
    });
    try {
      if (
        !['rss', 'feed'].includes(dom.window.document.documentElement.localName)
      )
        throw new Error('Independent reader expected RSS or Atom');
      return [
        ...dom.window.document.querySelectorAll('channel > item, feed > entry'),
      ].map((node) => xmlObject(node));
    } finally {
      dom.window.close();
    }
  }
  const payload = JSON.parse(bytes.toString('utf8'));
  if (sourceId === 'gdelt-immigration') return payload.articles;
  if (sourceId === 'wikimedia-miami') return Object.values(payload.query.pages);
  if (sourceId === 'census-acs') return payload.slice(1);
  if (sourceId === 'community-intake') return payload.reports;
  return payload.results;
}

function xmlObject(node) {
  const result = {};
  for (const attr of node.attributes) result['@_' + attr.name] = attr.value;
  for (const child of node.children) {
    const value = xmlObject(child);
    const key = child.tagName;
    if (!Object.hasOwn(result, key)) result[key] = value;
    else if (Array.isArray(result[key])) result[key].push(value);
    else result[key] = [result[key], value];
  }
  const textNodes = [...node.childNodes].filter((n) =>
    [3, 4].includes(n.nodeType),
  );
  const value = textNodes
    .map((node) =>
      node.nodeType === 4 ? node.nodeValue : node.nodeValue.trim(),
    )
    .join('');
  if (!Object.keys(result).length) return value;
  if (value) result['#text'] = value;
  return result;
}

export function expectedItem(
  sourceId,
  raw,
  body,
  source = {},
  parserVersion = 'amparo-public-data/3',
) {
  const base = {
    sourceId,
    observedAt: null,
    areaId: null,
    language: 'en',
    media: [],
  };
  let result;
  if (sourceId === 'federal-register')
    result = {
      kind: 'policy',
      externalId: raw.document_number,
      title: raw.title,
      url: raw.html_url,
      publishedAt: raw.publication_date,
      datePrecision: 'day',
    };
  else if (sourceId === 'doj-immigration')
    result = {
      kind: 'news',
      externalId: raw.uuid,
      title: raw.title,
      url: raw.url,
      publishedAt: new Date(Number(raw.date) * 1000).toISOString(),
      datePrecision: 'instant',
    };
  else if (
    source.parser === 'rss' ||
    ['immigration-impact', 'florida-phoenix'].includes(sourceId)
  )
    result = {
      ...rssExpected(raw, parserVersion),
      ...(source.parser === 'rss'
        ? { language: source.language ?? null, kind: source.kind }
        : {}),
    };
  else if (sourceId === 'gdelt-immigration') result = gdeltExpected(raw);
  else if (sourceId === 'wikimedia-miami') result = imageExpected(raw);
  else if (sourceId === 'census-acs') result = censusExpected(raw, body);
  else if (sourceId === 'community-intake')
    result = {
      kind: 'community_report',
      externalId: raw.reportId,
      title: raw.description,
      url: raw.evidenceUrls[0] ?? null,
      publishedAt: null,
      datePrecision: 'unknown',
      observedAt: new Date(raw.observedAt).toISOString(),
      areaId: raw.areaId,
      language: null,
      reportType: raw.type,
      reportedPeople: raw.reportedPeople,
      evidenceUrls: raw.evidenceUrls.map((url) => new URL(url.trim()).href),
    };
  else throw new Error('Independent reader does not support ' + sourceId);
  return {
    ...base,
    ...result,
    externalId: result.externalId.trim(),
    title: result.title.trim(),
    url: result.url === null ? null : new URL(result.url.trim()).href,
  };
}

function rssExpected(raw, parserVersion) {
  const url =
    typeof raw.link === 'object'
      ? list(raw.link).find((r) => !r['@_rel'] || r['@_rel'] === 'alternate')?.[
          '@_href'
        ]
      : raw.link;
  const date = one(raw.pubDate ?? raw.published ?? raw.updated);
  return {
    kind: 'news',
    externalId: one(raw.guid ?? raw.id) ?? url,
    title: one(raw.title),
    url,
    publishedAt: date ? new Date(date).toISOString() : null,
    datePrecision: date ? 'instant' : 'unknown',
    media: parserVersion.startsWith('amparo-public-data/2')
      ? list(raw.enclosure)
          .filter((r) => r['@_type']?.startsWith('image/'))
          .map((r) => ({
            url: new URL(r['@_url'].trim()).href,
            reuseStatus: 'permission-required',
          }))
      : rssMediaExpected(raw, url),
  };
}

function rssMediaExpected(raw, articleUrl) {
  // Independently reconstruct candidates from captured source fields. Never use
  // production media helpers, exported media or the stored payload as truth.
  const nodes = [];
  for (const enclosure of list(raw.enclosure)) {
    if (enclosure?.['@_type']?.startsWith('image/'))
      nodes.push([enclosure, 'rss-enclosure']);
  }
  for (const container of [raw, ...list(raw['media:group'])]) {
    for (const content of list(container?.['media:content'])) {
      if (
        content?.['@_type']?.startsWith('video/') ||
        content?.['@_medium'] === 'video'
      )
        continue;
      if (
        content?.['@_medium'] === 'image' ||
        content?.['@_type']?.startsWith('image/')
      )
        nodes.push([content, 'rss-media-content']);
    }
  }
  for (const thumbnail of list(raw['media:thumbnail']))
    nodes.push([thumbnail, 'rss-media-thumbnail']);
  const markup =
    one(raw['content:encoded']) || one(raw.description) || one(raw.summary);
  nodes.push(...expectedHtmlNodes(markup));
  const expected = [];
  for (const [node, provenance] of nodes) {
    const photo = expectedPhoto(node, provenance, articleUrl);
    if (!photo || expected.some((prior) => prior.url === photo.url)) continue;
    expected.push(photo);
    if (expected.length === 5) break;
  }
  return expected;
}

function expectedHtmlNodes(markup) {
  const nodes = [];
  if (typeof markup === 'string') {
    const document = new JSDOM(markup).window.document;
    for (const img of document.images) {
      if (
        img.hasAttribute('hidden') ||
        img.style.display === 'none' ||
        img.style.visibility === 'hidden'
      )
        continue;
      nodes.push([
        {
          '@_url': img.getAttribute('src'),
          '@_width': img.getAttribute('width'),
          '@_height': img.getAttribute('height'),
          'media:title': img.getAttribute('alt'),
          'media:credit': img.closest('figure')?.querySelector('figcaption')
            ?.textContent,
        },
        'rss-content-image',
      ]);
    }
    document.defaultView.close();
  }
  return nodes;
}

function decoded(value, max = 1000) {
  const scalar = one(value);
  return typeof scalar === 'string'
    ? JSDOM.fragment(scalar).textContent.trim().slice(0, max)
    : '';
}

function expectedPhoto(node, provenance, articleUrl) {
  if (
    !node ||
    [node['@_width'], node['@_height']].some((n) => n && Number(n) <= 2)
  )
    return null;
  if (
    typeof node['@_url'] !== 'string' ||
    !node['@_url'].trim() ||
    node['@_url'].length > 4096
  )
    return null;
  let url;
  try {
    url = new URL(decoded(node['@_url'], 4096), articleUrl);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !url.hostname.includes('.') ||
    url.hostname.endsWith('.local') ||
    isIP(url.hostname.replaceAll('[', '').replaceAll(']', ''))
  )
    return null;
  const alt = decoded(node['media:title']),
    credit = decoded(node['media:credit']);
  return {
    url: url.href,
    reuseStatus: 'permission-required',
    provenance,
    ...(alt ? { alt } : {}),
    ...(credit ? { credit } : {}),
  };
}

function gdeltExpected(raw) {
  const d = raw.seendate;
  const indexedAt = d
    ? new Date(
        Date.UTC(
          Number(d.substring(0, 4)),
          Number(d.substring(4, 6)) - 1,
          Number(d.substring(6, 8)),
          Number(d.substring(9, 11)),
          Number(d.substring(11, 13)),
          Number(d.substring(13, 15)),
        ),
      ).toISOString()
    : null;
  return {
    kind: 'news',
    externalId: raw.url,
    title: raw.title,
    url: raw.url,
    publishedAt: null,
    datePrecision: 'unknown',
    language: raw.language ?? null,
    extraTimes: { indexedAt },
    media: raw.socialimage
      ? [{ url: raw.socialimage, reuseStatus: 'permission-required' }]
      : [],
  };
}

function imageExpected(raw) {
  const info = raw.imageinfo[0];
  const meta = info.extmetadata ?? {};
  return {
    kind: 'media',
    externalId: String(raw.pageid),
    title: raw.title,
    url: info.descriptionurl,
    publishedAt: null,
    datePrecision: 'unknown',
    media: [
      {
        url: new URL(info.url.trim()).href,
        license: meta.LicenseShortName?.value ?? null,
        licenseUrl: meta.LicenseUrl?.value
          ? new URL(meta.LicenseUrl.value.trim()).href
          : null,
        creator: meta.Artist?.value ?? null,
        credit: meta.Credit?.value ?? null,
        attributionRequired: meta.AttributionRequired?.value ?? null,
        reuseStatus: 'verify-at-source',
      },
    ],
  };
}

function censusExpected(raw, bytes) {
  const headers = JSON.parse(bytes.toString())[0];
  const row = Object.fromEntries(headers.map((h, i) => [h, raw[i]]));
  const number = (key) =>
    row[key] === null || row[key] === '' || Number(row[key]) < 0
      ? null
      : Number(row[key]);
  const areaId = 'US-' + row.state + row.county;
  return {
    kind: 'statistic',
    externalId: '2024-' + areaId,
    title: row.NAME,
    url: 'https://data.census.gov/profile?g=050XX00US' + row.state + row.county,
    publishedAt: null,
    datePrecision: 'unknown',
    areaId,
    statistics: {
      vintage: 2024,
      period: 'ACS 5-year',
      population: number('B05002_001E'),
      populationMarginOfError: number('B05002_001M'),
      foreignBorn: number('B05002_013E'),
      foreignBornMarginOfError: number('B05002_013M'),
    },
  };
}
