export const familyStages = {
  reported: ['Report received', 'Reporte recibido'],
  contacted: ['Family in contact', 'Familia en contacto'],
  located: ['Location confirmed', 'Ubicación confirmada'],
  supported: ['Legal help connected', 'Apoyo legal conectado'],
  resolved: ['Follow-up complete', 'Seguimiento completo'],
};

export function createFamilyService({ now = () => new Date() } = {}) {
  let cases;
  const reset = () => {
    cases = [
      {
        id: 'family-sample',
        name: 'Carlos · sample',
        area: 'Miami-Dade',
        audience: 'private-family',
        stage: 'contacted',
        reportId: null,
        nextCheckAt: new Date(now().getTime() + 3600000).toISOString(),
        events: [
          {
            stage: 'reported',
            note: 'Sample: Elena opened a private family check-in.',
            at: new Date(now().getTime() - 3600000).toISOString(),
          },
          {
            stage: 'contacted',
            note: 'Sample: family made contact. Confirm the next update together.',
            at: new Date(now().getTime() - 1800000).toISOString(),
          },
        ],
      },
    ];
  };
  reset();
  return {
    mode: 'demo',
    list: () => structuredClone(cases),
    get: (id) => structuredClone(cases.find((item) => item.id === id)),
    fromReport(report) {
      const existing = cases.find((item) => item.reportId === report.id);
      if (existing) return structuredClone(existing);
      const item = {
        id: 'family-' + report.id,
        reportId: report.id,
        name: 'Family report',
        area: report.name,
        audience: 'private-family',
        stage: 'reported',
        nextCheckAt: new Date(now().getTime() + 3600000).toISOString(),
        events: [
          {
            stage: 'reported',
            note: 'Your sample report was received. It is still unconfirmed.',
            at: now().toISOString(),
          },
        ],
      };
      cases.unshift(item);
      return structuredClone(item);
    },
    update(id, { stage, note, checkInHours = 1 }) {
      const item = cases.find((entry) => entry.id === id);
      if (!item) throw new Error('Family case not found.');
      if (!Object.hasOwn(familyStages, stage))
        throw new Error('Choose a valid stage.');
      const text = String(note ?? '').trim();
      if (text.length < 8 || text.length > 800)
        throw new Error('Use an update note of 8 to 800 characters.');
      if (![1, 4, 24, 168].includes(Number(checkInHours)))
        throw new Error('Choose a check-in interval.');
      item.stage = stage;
      item.events.push({ stage, note: text, at: now().toISOString() });
      item.nextCheckAt =
        stage === 'resolved'
          ? null
          : new Date(
              now().getTime() + Number(checkInHours) * 3600000,
            ).toISOString();
      return structuredClone(item);
    },
    reset,
  };
}
