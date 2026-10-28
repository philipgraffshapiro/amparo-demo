import { record, publicationDate } from './common.mjs';

export function federalRegister(source, payload) {
  if (!Array.isArray(payload.results) || !Number.isSafeInteger(payload.count))
    throw new Error('Federal Register schema: results/count missing');
  return {
    rows: payload.results,
    declaredTotal: payload.count,
    next: payload.next_page_url ?? null,
    coverage: 'query-window',
    convert: (raw) =>
      record(source, raw, {
        externalId: raw.document_number,
        title: raw.title,
        url: raw.html_url,
        publishedAt: raw.publication_date,
        datePrecision: 'day',
      }),
  };
}

export function justice(source, payload, currentUrl) {
  const meta = payload.metadata?.resultset;
  if (
    !Array.isArray(payload.results) ||
    !meta ||
    !Number.isSafeInteger(Number(meta.count))
  )
    throw new Error('DOJ schema: results/metadata missing');
  const page = Number(meta.page);
  const pageSize = Number(meta.pagesize);
  if (!Number.isInteger(page) || !Number.isInteger(pageSize) || pageSize < 1)
    throw new Error('DOJ pagination metadata invalid');
  let next = null;
  if ((page + 1) * pageSize < Number(meta.count) && currentUrl) {
    const url = new URL(currentUrl);
    url.searchParams.set('page', String(page + 1));
    next = url.href;
  }
  return {
    rows: payload.results,
    declaredTotal: Number(meta.count),
    next,
    coverage: 'title-query-history',
    convert: (raw) =>
      record(source, raw, {
        externalId: raw.uuid,
        title: raw.title,
        url: raw.url,
        publishedAt: new Date(Number(raw.date) * 1000).toISOString(),
      }),
  };
}

export function gdelt(source, payload) {
  if (!Array.isArray(payload.articles))
    throw new Error('GDELT schema: articles missing');
  return {
    rows: payload.articles,
    declaredTotal: null,
    next: null,
    capped: payload.articles.length >= (source.pageSize ?? 50),
    coverage: 'capped-search-results',
    convert: (raw) =>
      record(source, raw, {
        externalId: raw.url,
        title: raw.title,
        url: raw.url,
        publishedAt: null,
        extra: {
          language: raw.language ?? null,
          extraTimes: { indexedAt: gdeltDate(raw.seendate) },
          media: raw.socialimage
            ? [{ url: raw.socialimage, reuseStatus: 'permission-required' }]
            : [],
        },
      }),
  };
}

function gdeltDate(value) {
  if (!value) return null;
  if (
    typeof value !== 'string' ||
    value.length !== 16 ||
    value[8] !== 'T' ||
    value[15] !== 'Z'
  )
    throw new Error('Invalid GDELT seen date');
  return publicationDate(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` +
      `T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`,
  );
}

export function census(source, payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0]))
    throw new Error('Census schema invalid');
  const headers = payload[0];
  const required = [
    'NAME',
    'B05002_001E',
    'B05002_001M',
    'B05002_013E',
    'B05002_013M',
    'state',
    'county',
  ];
  if (
    required.some((key) => !headers.includes(key)) ||
    new Set(headers).size !== headers.length
  )
    throw new Error('Census required columns missing or duplicate');
  return {
    rows: payload.slice(1),
    declaredTotal: payload.length - 1,
    next: null,
    coverage: 'three-county-acs-5-year',
    convert: (raw) => {
      if (raw.length !== headers.length)
        throw new Error('Census column mismatch');
      const row = Object.fromEntries(headers.map((key, i) => [key, raw[i]]));
      const areaId = 'US-' + row.state + row.county;
      return record(source, raw, {
        externalId: `${source.vintage}-${areaId}`,
        title: row.NAME,
        url: `https://data.census.gov/profile?g=050XX00US${row.state}${row.county}`,
        publishedAt: null,
        extra: {
          areaId,
          statistics: {
            vintage: source.vintage,
            period: 'ACS 5-year',
            population: estimate(row.B05002_001E),
            populationMarginOfError: estimate(row.B05002_001M),
            foreignBorn: estimate(row.B05002_013E),
            foreignBornMarginOfError: estimate(row.B05002_013M),
          },
        },
      });
    },
  };
}

function estimate(value) {
  if (value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Invalid Census estimate');
  return number < 0 ? null : number;
}
