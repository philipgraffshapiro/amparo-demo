// Local sample data only. Each factory creates a fresh, isolated demo session.
export function createDemoServices() {
  const planId = 'amparo-monthly';
  let membership = { status: 'inactive', demo: true, planId };
  let checkout = null;
  const documents = new Map();
  const categories = new Set(['identity', 'family', 'residence']);

  return {
    version: 1,
    mode: 'demo',
    auth: {
      async getSession() {
        return { id: 'sample-family', demo: true };
      },
    },
    billing: {
      async getQuote() {
        return {
          planId,
          amountCents: 5000,
          currency: 'USD',
          interval: 'month',
          demo: true,
        };
      },
      async checkout(request) {
        if (request?.planId !== planId || !request.idempotencyKey)
          throw new Error('Invalid sample checkout');
        checkout ??= {
          id: 'sample-checkout',
          status: 'demo-complete',
          chargedCents: 0,
          demo: true,
        };
        return { ...checkout };
      },
    },
    membership: {
      async get() {
        return { ...membership };
      },
      async activate(request) {
        if (!checkout || request?.checkoutId !== checkout.id)
          throw new Error('Complete sample checkout first');
        membership = { ...membership, status: 'demo-active' };
        return { ...membership };
      },
    },
    documents: {
      async list() {
        return [...documents.values()].map((entry) => ({ ...entry }));
      },
      async addSample(request) {
        if (!categories.has(request?.category))
          throw new Error('Unknown sample category');
        const entry = {
          id: `sample-${request.category}`,
          category: request.category,
          demo: true,
        };
        documents.set(entry.id, entry);
        return { ...entry };
      },
    },
    alerts: {
      async simulate(request) {
        if (request?.scenario !== 'family-plan')
          throw new Error('Unknown sample scenario');
        return {
          demo: true,
          delivered: false,
          stages: ['prepared', 'contact-preview', 'legal-next-step'],
        };
      },
    },
  };
}
