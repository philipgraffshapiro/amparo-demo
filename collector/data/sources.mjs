import { newsSources } from './news-sources.mjs';

const common = {
  enabled: true,
  pageSize: 50,
  maxPages: 3,
  minIntervalMs: 1100,
  maxBytes: 3 * 1024 * 1024,
  language: 'en',
};

export const sources = [
  {
    ...common,
    id: 'federal-register',
    name: 'Federal Register immigration notices',
    parser: 'federal-register',
    kind: 'policy',
    endpoint: 'https://www.federalregister.gov/api/v1/documents.json',
    hosts: ['www.federalregister.gov'],
    scope: 'rolling-30-day-query',
    pollMinutes: 60,
  },
  {
    ...common,
    id: 'doj-immigration',
    name: 'DOJ immigration press releases',
    parser: 'justice',
    kind: 'news',
    endpoint: 'https://www.justice.gov/api/v1/press_releases.json',
    hosts: ['www.justice.gov'],
    scope: 'title-query-latest-150',
    pollMinutes: 30,
    parameters: {
      'parameters[title]': 'immigration',
      sort: 'date',
      direction: 'DESC',
      pagesize: '50',
      page: '0',
      fields: 'uuid,title,date,url',
    },
  },
  {
    ...common,
    id: 'immigration-impact',
    name: 'American Immigration Council: Immigration Impact',
    parser: 'rss',
    kind: 'news',
    endpoint: 'https://www.americanimmigrationcouncil.org/feed/',
    hosts: [
      'www.americanimmigrationcouncil.org',
      'americanimmigrationcouncil.org',
    ],
    scope: 'publisher-feed-snapshot',
    maxPages: 1,
    pollMinutes: 15,
  },
  {
    ...common,
    id: 'florida-phoenix',
    name: 'Florida Phoenix statewide news',
    parser: 'rss',
    kind: 'news',
    endpoint: 'https://floridaphoenix.com/feed/',
    hosts: ['floridaphoenix.com', 'www.floridaphoenix.com'],
    scope: 'publisher-feed-snapshot-all-topics',
    maxPages: 1,
    pollMinutes: 15,
  },
  {
    ...common,
    id: 'gdelt-immigration',
    name: 'GDELT US immigration news discovery',
    parser: 'gdelt',
    kind: 'news',
    endpoint: 'https://api.gdeltproject.org/api/v2/doc/doc',
    hosts: ['api.gdeltproject.org'],
    scope: 'capped-24-hour-query',
    maxPages: 1,
    pollMinutes: 15,
    minIntervalMs: 6000,
    parameters: {
      query: '"immigration" sourcecountry:US',
      mode: 'artlist',
      format: 'json',
      maxrecords: '50',
      timespan: '24h',
      sort: 'datedesc',
    },
  },
  {
    ...common,
    id: 'wikimedia-miami',
    name: 'Wikimedia Commons Miami images',
    parser: 'wikimedia',
    kind: 'media',
    endpoint: 'https://commons.wikimedia.org/w/api.php',
    hosts: ['commons.wikimedia.org'],
    scope: 'first-10-image-search-results',
    maxPages: 1,
    pollMinutes: 1440,
    parameters: {
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: 'Miami skyline',
      gsrnamespace: '6',
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
    },
  },
  {
    ...common,
    id: 'census-acs',
    name: 'Census ACS 5-year county context',
    parser: 'census',
    kind: 'statistic',
    endpoint: 'https://api.census.gov/data/2024/acs/acs5',
    hosts: ['api.census.gov'],
    scope: 'three-counties-2024-acs5',
    maxPages: 1,
    vintage: 2024,
    pollMinutes: 43200,
    requiresEnv: 'CENSUS_API_KEY',
    keyParam: 'key',
    parameters: {
      get: 'NAME,B05002_001E,B05002_001M,B05002_013E,B05002_013M',
      for: 'county:011,086,099',
      in: 'state:12',
    },
  },
  ...newsSources,
];

export function sourceUrl(source, now = new Date()) {
  const url = new URL(source.endpoint);
  if (source.parameters)
    url.search = new URLSearchParams(source.parameters).toString();
  if (source.parser === 'federal-register') {
    url.search = new URLSearchParams({
      'conditions[term]': 'immigration',
      'conditions[publication_date][gte]': new Date(
        now.getTime() - 30 * 86400000,
      )
        .toISOString()
        .slice(0, 10),
      per_page: String(source.pageSize),
      order: 'newest',
    }).toString();
  }
  return url.href;
}

export function getSource(id) {
  const source = sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return source;
}
