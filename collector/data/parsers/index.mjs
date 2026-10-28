import { strictJson, publicUrl } from './common.mjs';
import { federalRegister, justice, gdelt, census } from './api.mjs';
import { rss } from './rss.mjs';
import { wikimedia } from './media.mjs';

const parsers = {
  'federal-register': federalRegister,
  justice,
  gdelt,
  census,
  wikimedia,
};

export function parsePage(source, bytes, currentUrl) {
  const parse = parsers[source.parser];
  if (!parse && source.parser !== 'rss')
    throw new Error('Unknown parser: ' + source.parser);
  const page =
    source.parser === 'rss'
      ? rss(source, bytes)
      : parse(source, strictJson(bytes), currentUrl);
  if (page.rows.length > 1000) throw new Error('Parser record limit exceeded');
  const records = [];
  const rejected = [];
  page.rows.forEach((raw, ordinal) => {
    try {
      const result = page.convert(raw);
      for (const media of result.normalized.media) publicUrl(media.url);
      records.push({ ...result, ordinal });
    } catch (error) {
      rejected.push({ ordinal, reason: error.message, sourceRecord: raw });
    }
  });
  return {
    records,
    rejected,
    declaredTotal: page.declaredTotal,
    next: page.next,
    seen: page.rows.length,
    coverage: page.coverage,
    capped: page.capped ?? false,
  };
}
