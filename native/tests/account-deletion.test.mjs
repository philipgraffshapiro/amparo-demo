import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteAccountHandler } from '../supabase/functions/_shared/delete-account.js';

function setup(overrides = {}) {
  const calls = [];
  const deps = {
    authenticate: async () => ({
      id: 'owner',
      last_sign_in_at: new Date().toISOString(),
      identities: [],
    }),
    begin: async (id) => calls.push(['begin', id]),
    objects: async () => [],
    removeObjects: async (bucket, keys) => calls.push(['remove', bucket, keys]),
    eraseData: async (id) => calls.push(['erase', id]),
    eraseIdentity: async (id) => calls.push(['identity', id]),
    revokeApple: async () => calls.push(['revoke']),
    ...overrides,
  };
  const run = (body = { confirmation: 'DELETE' }) =>
    deleteAccountHandler(
      new Request('https://example.test/delete', {
        method: 'POST',
        headers: {
          authorization: 'Bearer session',
          'content-type': 'application/json',
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
      deps,
    );
  return { calls, run };
}

test('deletion uses authenticated identity, never a client-selected account', async () => {
  const { run, calls } = setup();
  assert.equal(
    (await run({ confirmation: 'DELETE', userId: 'someone-else' })).status,
    400,
  );
  assert.deepEqual(calls, []);
  assert.equal((await run()).status, 200);
  assert.deepEqual(calls, [
    ['begin', 'owner'],
    ['erase', 'owner'],
    ['identity', 'owner'],
  ]);
});

test('invalid credentials, old login and malformed bodies cannot delete', async () => {
  for (const authenticate of [
    async () => null,
    async () => ({ id: 'owner', last_sign_in_at: '2020-01-01' }),
  ]) {
    const { calls, run } = setup({ authenticate });
    assert.ok([401, 409].includes((await run()).status));
    assert.deepEqual(calls, []);
  }
  const { calls, run } = setup();
  for (const body of ['{', 'x'.repeat(9000), '[]', '{"confirmation":"no"}']) {
    assert.ok([400, 413].includes((await run(body)).status));
  }
  assert.deepEqual(calls, []);
});

test('storage failure leaves identity intact and never reports success', async () => {
  const { calls, run } = setup({
    objects: async () => [
      { bucket_id: 'amparo-evidence', name: 'owner/photo.png' },
    ],
    removeObjects: async () => {
      throw new Error('storage unavailable');
    },
  });
  assert.equal((await run()).status, 503);
  assert.deepEqual(calls, [['begin', 'owner']]);
});

test('Apple identity requires revocation before personal data is erased', async () => {
  const { calls, run } = setup({
    authenticate: async () => ({
      id: 'owner',
      last_sign_in_at: new Date().toISOString(),
      identities: [{ provider: 'apple' }],
    }),
  });
  assert.equal((await run()).status, 409);
  assert.deepEqual(calls, []);
  assert.equal(
    (await run({ confirmation: 'DELETE', appleCode: 'fresh-code' })).status,
    200,
  );
  assert.deepEqual(
    calls.map((row) => row[0]),
    ['revoke', 'begin', 'erase', 'identity'],
  );
});
