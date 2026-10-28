import { parseSnapshot } from './model.js';

export const NEWS_MAX_BYTES = 1024 * 1024;

async function responseText(response, maxBytes, signal) {
  if (!response.ok) throw new Error('News response failed');
  if (Number(response.headers?.get('content-length')) > maxBytes)
    throw new Error('News response too large');
  if (!response.body?.getReader) throw new Error('News stream unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0,
    result = '';
  const cancel = () => reader.cancel().catch(() => undefined);
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error('News request cancelled');
      if (done) return result + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('News response too large');
      result += decoder.decode(value, { stream: true });
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function loadNews({
  fetch: fetcher,
  snapshot,
  signal,
  timeoutMs = 10000,
  maxBytes = NEWS_MAX_BYTES,
} = {}) {
  const request = new AbortController();
  const abort = () => request.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) request.abort();
  let timer;
  try {
    const response = await Promise.race([
      (async () => {
        if (!fetcher) throw new Error('News fetch unavailable');
        const result = await fetcher('./data/news.json', {
          cache: 'no-cache',
          signal: request.signal,
        });
        return parseSnapshot(
          JSON.parse(await responseText(result, maxBytes, request.signal)),
        );
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          request.abort();
          reject(new Error('News request timed out'));
        }, timeoutMs);
        request.signal.addEventListener(
          'abort',
          () => reject(new Error('News request cancelled')),
          { once: true },
        );
      }),
    ]);
    if (request.signal.aborted) throw new Error('News request cancelled');
    return { data: response, fallback: false, error: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    if (snapshot) {
      if (JSON.stringify(snapshot).length > maxBytes)
        throw new Error('News snapshot too large', { cause: error });
      return { data: parseSnapshot(snapshot), fallback: true, error: true };
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
