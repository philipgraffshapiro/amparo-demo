import { createClient } from '../vendor/supabase.js';
import { accountConfig } from './config.js';
import { createNativeAccount } from '../native/account.js';

export function createAccountService(window, config = accountConfig) {
  const bridge = window.AmparoNative;
  const secure = bridge ? createNativeAccount(bridge, {}) : null;
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !bridge,
      ...(secure ? { storage: secure.storage } : {}),
    },
  });
  const native = bridge ? createNativeAccount(bridge, client) : null;
  const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  async function api(path, body) {
    const { session } = unwrap(await client.auth.getSession());
    if (!session) throw new Error('Sign in required');
    const response = await window.fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Billing unavailable');
    return response.json();
  }
  return {
    available: true,
    appleEnabled: Boolean(native),
    deletionEnabled: Boolean(config.deletionEnabled),
    native: Boolean(native),
    signupEnabled: config.signupEnabled === true,
    googleEnabled: config.googleEnabled === true,
    passkeys:
      config.passkeysEnabled &&
      window.location.origin === config.passkeyOrigin &&
      window.isSecureContext &&
      Boolean(window.PublicKeyCredential),
    billingEnabled: config.billingEnabled,
    async initialize() {
      return unwrap(await client.auth.getSession()).session;
    },
    subscribe(callback) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Never await another auth operation while Supabase holds its session lock.
        window.setTimeout(() => callback(session, event), 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      return unwrap(await client.auth.signInWithPassword({ email, password }));
    },
    async signUp(email, password) {
      if (!config.signupEnabled)
        throw new Error('Account creation is not enabled yet');
      return unwrap(
        await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname,
          },
        }),
      );
    },
    async signOut() {
      unwrap(await client.auth.signOut({ scope: 'local' }));
    },
    async resetPassword(email) {
      unwrap(
        await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname,
        }),
      );
    },
    async updatePassword(password) {
      unwrap(await client.auth.updateUser({ password }));
    },
    async signInApple() {
      if (!native) throw new Error('Apple sign-in requires the iPhone app');
      return native.apple();
    },
    deleteAccount: () => deleteAccount(window, config, client, native, unwrap),
    async signInGoogle() {
      if (native) return native.google();
      if (!config.googleEnabled)
        throw new Error('Google sign-in is unavailable');
      return unwrap(
        await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname,
          },
        }),
      );
    },
    async signInPasskey() {
      return unwrap(await client.auth.signInWithPasskey());
    },
    async registerPasskey() {
      return unwrap(await client.auth.registerPasskey());
    },
    membership: () => api('membership'),
    checkout: (requestKey) => api('checkout', { requestKey }),
    portal: () => api('portal', {}),
  };
}

async function deleteAccount(window, config, client, native, unwrap) {
  if (!config.deletionEnabled)
    throw new Error('Account deletion is unavailable');
  const { session } = unwrap(await client.auth.getSession());
  if (!session) throw new Error('Sign in required');
  const appleCode = native?.takeAppleCode();
  const response = await window.fetch(
    config.url + '/functions/v1/delete-account',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + session.access_token,
        apikey: config.publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        confirmation: 'DELETE',
        ...(appleCode ? { appleCode } : {}),
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.code || 'Deletion failed');
  }
  unwrap(await client.auth.signOut({ scope: 'local' }));
}
