import { record, publicUrl } from './common.mjs';

export function wikimedia(source, payload) {
  if (!payload.query?.pages || typeof payload.query.pages !== 'object')
    throw new Error('Wikimedia query/pages missing');
  const rows = Object.values(payload.query.pages);
  return {
    rows,
    declaredTotal: null,
    next: null,
    coverage: 'capped-image-search',
    capped: Boolean(payload.continue),
    convert: (raw) => {
      const info = raw.imageinfo?.[0];
      if (!info) throw new Error('Image metadata missing');
      const metadata = info.extmetadata ?? {};
      return record(source, raw, {
        externalId: String(raw.pageid),
        title: raw.title,
        url: info.descriptionurl,
        publishedAt: null,
        extra: {
          media: [
            {
              url: publicUrl(info.url),
              license: metadata.LicenseShortName?.value ?? null,
              licenseUrl: metadata.LicenseUrl?.value
                ? publicUrl(metadata.LicenseUrl.value)
                : null,
              creator: metadata.Artist?.value ?? null,
              credit: metadata.Credit?.value ?? null,
              attributionRequired: metadata.AttributionRequired?.value ?? null,
              reuseStatus: 'verify-at-source',
            },
          ],
        },
      });
    },
  };
}
