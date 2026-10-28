import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import {
  SignJWT,
  importPKCS8,
  createRemoteJWKSet,
  jwtVerify,
} from 'npm:jose@6.1.0';
import { deleteAccountHandler } from '../_shared/delete-account.js';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const appleKeys = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);
async function unwrap(
  operation: PromiseLike<{ data: unknown; error: unknown }>,
) {
  const { data, error } = await operation;
  if (error) throw error;
  return data;
}
async function applePost(path: string, values: Record<string, string>) {
  const response = await fetch('https://appleid.apple.com/auth/' + path, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  });
  if (!response.ok) throw new Error('Apple revocation unavailable');
  return response;
}
Deno.serve((request: Request) =>
  deleteAccountHandler(request, {
    allowedOrigins: (Deno.env.get('AMPARO_ALLOWED_ORIGINS') || '')
      .split(',')
      .filter(Boolean),
    authenticate: async (token: string) => {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : data.user;
    },
    begin: (id: string) =>
      unwrap(admin.rpc('amparo_begin_deletion', { target: id })),
    objects: (id: string) =>
      unwrap(admin.rpc('amparo_deletion_objects', { target: id })),
    removeObjects: (bucket: string, keys: string[]) =>
      unwrap(admin.storage.from(bucket).remove(keys)),
    eraseData: (id: string) =>
      unwrap(admin.rpc('amparo_erase_account_data', { target: id })),
    eraseIdentity: (id: string) => unwrap(admin.auth.admin.deleteUser(id)),
    revokeApple: async (
      code: string,
      user: {
        identities?: {
          provider: string;
          identity_data?: Record<string, unknown>;
        }[];
      },
    ) => {
      const clientId = Deno.env.get('APPLE_CLIENT_ID');
      const teamId = Deno.env.get('APPLE_TEAM_ID');
      const keyId = Deno.env.get('APPLE_KEY_ID');
      const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
      if (!clientId || !teamId || !keyId || !privateKey)
        throw new Error('Apple credentials required');
      const key = await importPKCS8(privateKey, 'ES256');
      const secret = await new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: keyId })
        .setIssuer(teamId)
        .setSubject(clientId)
        .setAudience('https://appleid.apple.com')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(key);
      const response = await applePost('token', {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: secret,
      });
      const tokens = await response.json();
      const { payload } = await jwtVerify(tokens.id_token, appleKeys, {
        issuer: 'https://appleid.apple.com',
        audience: clientId,
      });
      const identity = user.identities?.find(
        (entry) => entry.provider === 'apple',
      );
      if (
        !identity?.identity_data?.sub ||
        payload.sub !== identity.identity_data.sub
      )
        throw new Error('Apple identity mismatch');
      if (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token)
        throw new Error('Apple refresh token missing');
      await applePost('revoke', {
        client_id: clientId,
        client_secret: secret,
        token: tokens.refresh_token,
        token_type_hint: 'refresh_token',
      });
    },
  }),
);
