import { cities, kinds, initialReports, sampleTime } from './data.js';
import { queryReports, reportsCSV } from './model.js';

function validateReport(request) {
  if (!Object.hasOwn(cities, request.city))
    throw new Error('Choose an area from the list.');
  if (!Object.hasOwn(kinds, request.kind))
    throw new Error('Choose a report type.');
  const date = new Date(`${request.date}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== request.date ||
    date.getTime() > Date.parse(sampleTime) ||
    date.getTime() < Date.parse(sampleTime) - 30 * 86400000
  )
    throw new Error('Choose a date within the sample reporting period.');
  const description = String(request.description || '').trim();
  if (description.length < 12 || description.length > 800)
    throw new Error('Use 12 to 800 characters to describe the observation.');
  const people =
    request.kind === 'detention' &&
    request.people !== '' &&
    request.people !== null &&
    request.people !== undefined
      ? Number(request.people)
      : null;
  if (
    people !== null &&
    (!Number.isInteger(people) || people < 1 || people > 99)
  )
    throw new Error('Enter 1 to 99 people, or leave the count blank.');
  if (!request.idempotencyKey)
    throw new Error('A submission identifier is required.');
  return { description, people, occurredAt: date.toISOString() };
}

export function createCommunityService() {
  let reports = initialReports();
  let sequence = 0;
  const submissions = new Map();
  return {
    version: 1,
    mode: 'demo',
    async list(filters) {
      return queryReports(reports, filters);
    },
    async submit(request) {
      const valid = validateReport(request);
      if (submissions.has(request.idempotencyKey))
        return structuredClone(submissions.get(request.idempotencyKey));
      const report = {
        id: `community-${++sequence}`,
        ...cities[request.city],
        city: request.city,
        kind: request.kind,
        occurredAt: valid.occurredAt,
        status: 'unconfirmed',
        people: valid.people,
        description: { en: valid.description, es: valid.description },
        source: { en: 'Your sample submission', es: 'Tu envío de ejemplo' },
        demo: true,
      };
      reports.unshift(report);
      submissions.set(request.idempotencyKey, report);
      return structuredClone(report);
    },
    async export(filters) {
      return reportsCSV(queryReports(reports, filters).reports);
    },
    reset() {
      reports = initialReports();
      submissions.clear();
      sequence = 0;
    },
  };
}
