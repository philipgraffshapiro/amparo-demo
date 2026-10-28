import test from 'node:test';
import assert from 'node:assert/strict';
import { callbackCode, createNativeAccount } from '../public/native/account.js';

test('native OAuth accepts only its exact callback and a single code', () => {
  assert.equal(
    callbackCode('com.amparoaccess.app://auth/callback?code=abc'),
    'abc',
  );
  for (const value of [
    'https://evil.example/auth/callback?code=abc',
    'com.amparoaccess.app://evil/callback?code=abc',
    'com.amparoaccess.app://auth/other?code=abc',
    'com.amparoaccess.app://auth/callback?code=a&code=b',
    'com.amparoaccess.app://auth/callback#access_token=secret',
    'com.amparoaccess.app://user@auth/callback?code=abc',
    'com.amparoaccess.app://auth/callback?error=denied&code=abc',
    'bad url',
  ])
    assert.throws(() => callbackCode(value));
});

test('native Google opens system auth and exchanges the PKCE code', async () => {
  const calls = [];
  const client = {
    auth: {
      signInWithOAuth: async (args) => {
        calls.push(args);
        return {
          data: { url: 'https://project.supabase.co/auth/v1/authorize' },
        };
      },
      exchangeCodeForSession: async (code) => {
        calls.push(code);
        return { data: { session: true } };
      },
    },
  };
  const native = createNativeAccount(
    {
      authenticate: async () => ({
        url: 'com.amparoaccess.app://auth/callback?code=returned',
      }),
    },
    client,
  );
  await native.google();
  assert.equal(calls[0].options.skipBrowserRedirect, true);
  assert.equal(
    calls[0].options.redirectTo,
    'com.amparoaccess.app://auth/callback',
  );
  assert.equal(calls[1], 'returned');
});

test('Apple cancellation or missing token never creates a session', async () => {
  let calls = 0;
  const client = {
    auth: {
      signInWithIdToken: async () => {
        calls++;
        return { data: {} };
      },
    },
  };
  for (const apple of [
    async () => {
      throw new Error('cancelled');
    },
    async () => ({}),
  ]) {
    await assert.rejects(createNativeAccount({ apple }, client).apple());
  }
  assert.equal(calls, 0);
});

test('native auth storage uses the platform keychain adapter', async () => {
  const rows = new Map();
  const native = createNativeAccount(
    {
      readSecret: async ({ key }) => ({ value: rows.get(key) ?? null }),
      writeSecret: async ({ key, value }) => {
        rows.set(key, value);
      },
      removeSecret: async ({ key }) => {
        rows.delete(key);
      },
    },
    {},
  );
  await native.storage.setItem('session', 'private');
  assert.equal(await native.storage.getItem('session'), 'private');
  await native.storage.removeItem('session');
  assert.equal(await native.storage.getItem('session'), null);
});
