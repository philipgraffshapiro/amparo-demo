import { regions, sampleTime } from './data.js';

export const defaultFilters = () => ({
  query: '',
  range: '7d',
  region: 'all',
  kind: 'all',
  status: 'all',
});

export function queryReports(reports, filters = {}, snapshotAt = sampleTime) {
  const f = { ...defaultFilters(), ...filters };
  const days = { '24h': 1, '7d': 7, '30d': 30 }[f.range] || 7;
  const end = Date.parse(snapshotAt);
  const start = end - days * 86400000;
  const query = String(f.query).trim().toLocaleLowerCase();
  const selected = reports
    .filter((report) => {
      const time = Date.parse(report.occurredAt);
      return (
        time >= start &&
        time <= end &&
        (f.region === 'all' || report.region === f.region) &&
        (f.kind === 'all' || report.kind === f.kind) &&
        (f.status === 'all' || report.status === f.status) &&
        `${report.name} ${report.region} ${report.description.en} ${report.description.es}`
          .toLocaleLowerCase()
          .includes(query)
      );
    })
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  const detentions = selected.filter((report) => report.kind === 'detention');
  return {
    version: 1,
    mode: 'demo',
    snapshotAt,
    reports: structuredClone(selected),
    stats: {
      reports: selected.length,
      detentions: detentions.length,
      people: detentions.reduce(
        (total, report) => total + (report.people ?? 0),
        0,
      ),
      unknownPeople: detentions.filter((report) => report.people === null)
        .length,
      unconfirmed: selected.filter((report) => report.status === 'unconfirmed')
        .length,
      areas: regions.map((region) => ({
        ...region,
        count: selected.filter((report) => report.region === region.id).length,
      })),
    },
  };
}

export function timeline(reports, snapshotAt = sampleTime) {
  return Array.from({ length: 7 }, (_, index) => {
    const end = Date.parse(snapshotAt) - (6 - index) * 86400000;
    const start = end - 86400000;
    return {
      date: new Date(end).toISOString().slice(0, 10),
      count: reports.filter((report) => {
        const time = Date.parse(report.occurredAt);
        return time <= end && (index === 0 ? time >= start : time > start);
      }).length,
    };
  });
}

export function reportsCSV(reports) {
  const quote = (value) => {
    const text = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = [
    [
      'demo',
      'report_id',
      'date_utc',
      'city',
      'region',
      'type',
      'review_status',
      'reported_people',
      'description',
      'source',
    ],
  ];
  for (const report of reports)
    rows.push([
      true,
      report.id,
      report.occurredAt,
      report.name,
      report.region,
      report.kind,
      report.status,
      report.people,
      report.description.en,
      report.source.en,
    ]);
  return rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
