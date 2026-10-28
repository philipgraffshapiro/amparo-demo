export const nativeRedirect = 'com.amparoaccess.app://auth/callback';

export function callbackCode(value) {
  const url = new URL(value);
  if (
    url.origin !== 'null' ||
    url.protocol !== 'com.amparoaccess.app:' ||
    url.host !== 'auth' ||
    url.pathname !== '/callback' ||
    url.username ||
    url.password ||
    url.hash ||
    url.searchParams.has('error') ||
    url.searchParams.getAll('code').length !== 1
  )
    throw new Error('Invalid sign-in callback');
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) throw new Error('Invalid sign-in code');
  return code;
}

export function createNativeAccount(bridge, client) {
  let appleCode;
  const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  return {
    storage: {
      getItem: async (key) => (await bridge.readSecret({ key })).value,
      setItem: async (key, value) => {
        await bridge.writeSecret({ key, value });
      },
      removeItem: async (key) => {
        await bridge.removeSecret({ key });
      },
    },
    async google() {
      const data = unwrap(
        await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: nativeRedirect, skipBrowserRedirect: true },
        }),
      );
      const result = await bridge.authenticate({ url: data.url });
      return unwrap(
        await client.auth.exchangeCodeForSession(callbackCode(result.url)),
      );
    },
    async apple() {
      const result = await bridge.apple();
      if (!result.identityToken || !result.nonce || !result.authorizationCode)
        throw new Error('Apple sign-in did not return credentials');
      const data = unwrap(
        await client.auth.signInWithIdToken({
          provider: 'apple',
          token: result.identityToken,
          nonce: result.nonce,
        }),
      );
      appleCode = result.authorizationCode;
      return data;
    },
    takeAppleCode() {
      const value = appleCode;
      appleCode = undefined;
      return value;
    },
  };
}
