const allowedOrigins = new Set([
  'capacitor://localhost',
  'https://philipgraffshapiro.github.io',
]);
const reply = (status, code, origin) =>
  new Response(JSON.stringify({ code }), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': origin || 'capacitor://localhost',
      'access-control-allow-headers':
        'authorization, apikey, content-type, x-client-info',
      'access-control-allow-methods': 'POST, OPTIONS',
      vary: 'Origin',
    },
  });

async function bodyOf(request) {
  if (!request.body) throw new Error('invalid');
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8192) {
        await reader.cancel();
        throw new Error('large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const body = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes),
  );
  if (
    !body ||
    Array.isArray(body) ||
    body.confirmation !== 'DELETE' ||
    Object.keys(body).some(
      (key) => !['confirmation', 'appleCode'].includes(key),
    ) ||
    (body.appleCode !== undefined &&
      (typeof body.appleCode !== 'string' || body.appleCode.length > 4096))
  )
    throw new Error('invalid');
  return body;
}

export async function deleteAccountHandler(request, deps) {
  const origin = request.headers.get('origin');
  const permitted = new Set([
    ...allowedOrigins,
    ...(deps.allowedOrigins || []),
  ]);
  if (origin && !permitted.has(origin))
    return reply(403, 'origin_rejected', null);
  if (request.method === 'OPTIONS') return reply(200, 'ok', origin);
  if (request.method !== 'POST') return reply(405, 'method_rejected', origin);
  if (!request.headers.get('authorization')?.startsWith('Bearer '))
    return reply(401, 'sign_in_required', origin);
  if (
    request.headers.get('content-type')?.split(';')[0].trim() !==
    'application/json'
  )
    return reply(415, 'json_required', origin);
  let body;
  try {
    body = await bodyOf(request);
  } catch (error) {
    return reply(
      error.message === 'large' ? 413 : 400,
      'invalid_request',
      origin,
    );
  }
  try {
    const user = await deps.authenticate(
      request.headers.get('authorization').slice(7),
    );
    if (!user?.id) return reply(401, 'sign_in_required', origin);
    const age = Date.now() - Date.parse(user.last_sign_in_at);
    if (!Number.isFinite(age) || age < -60000 || age > 10 * 60 * 1000)
      return reply(409, 'reauthentication_required', origin);
    if (user.identities?.some((identity) => identity.provider === 'apple')) {
      if (!body.appleCode)
        return reply(409, 'apple_reauthentication_required', origin);
      await deps.revokeApple(body.appleCode, user);
    }
    // Block new writes before removing storage. A failed cleanup can be retried.
    await deps.begin(user.id);
    if (!(await removeStorage(deps, user.id)))
      return reply(503, 'cleanup_retry_required', origin);
    await deps.eraseData(user.id);
    await deps.eraseIdentity(user.id);
    return reply(200, 'account_deleted', origin);
  } catch {
    return reply(503, 'deletion_unavailable_retry', origin);
  }
}

async function removeStorage(deps, id) {
  let empty = false;
  for (let page = 0; page < 50; page++) {
    const objects = await deps.objects(id);
    if (!objects.length) {
      empty = true;
      break;
    }
    for (const bucket of new Set(objects.map((object) => object.bucket_id))) {
      if (!['amparo-evidence', 'amparo-approved-media'].includes(bucket))
        throw new Error('Unexpected bucket');
      await deps.removeObjects(
        bucket,
        objects
          .filter((object) => object.bucket_id === bucket)
          .map((object) => object.name),
      );
    }
  }

  return empty;
}
