import { setTimeout as delay } from 'node:timers/promises';

const transient = new Set([429, 500, 502, 503, 504]);
const userAgent =
  'AmparoData/0.1 (+https://github.com/philipgraffshapiro/amparo-demo)';

export class HttpClient {
  constructor({
    deadlineMs = 90000,
    maxRequests = 20,
    allowLoopback = false,
  } = {}) {
    this.deadline = performance.now() + deadlineMs;
    this.remainingRequests = maxRequests;
    this.allowLoopback = allowLoopback;
    this.hostReady = new Map();
  }

  async get(address, source) {
    let url = address;
    let lastResponse;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.request(url, source);
        lastResponse = response;
        if (response.status >= 300 && response.status < 400) {
          if (!response.headers.location) return response;
          url = new URL(response.headers.location, url).href;
          continue;
        }
        if (!transient.has(response.status) || attempt === 2) return response;
        const header = response.headers['retry-after'];
        const retryMs = header ? retryAfter(header) : 500 * 2 ** attempt;
        const waitMs = retryMs + Math.floor(Math.random() * 100);
        const host = new URL(url).hostname;
        this.hostReady.set(
          host,
          Math.max(this.hostReady.get(host) ?? 0, performance.now() + waitMs),
        );
      } catch (error) {
        error.response ??= lastResponse;
        throw error;
      }
    }
    throw new Error('Redirect limit exceeded');
  }

  async request(address, source) {
    const url = new URL(address);
    const loopback =
      this.allowLoopback &&
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1';
    if (
      (!loopback && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      !source.hosts.includes(url.hostname)
    )
      throw new Error('Source host not allowed');
    const waitMs = Math.max(
      0,
      (this.hostReady.get(url.hostname) ?? 0) - performance.now(),
    );
    if (performance.now() + waitMs >= this.deadline)
      throw new Error('Operation deadline exceeded');
    if (waitMs) await delay(waitMs);
    if (this.remainingRequests-- <= 0)
      throw new Error('Request budget exhausted');
    this.hostReady.set(url.hostname, performance.now() + source.minIntervalMs);
    const timeout = Math.max(
      1,
      Math.min(20000, Math.floor(this.deadline - performance.now())),
    );
    const requestUrl = new URL(url);
    if (source.requiresEnv) {
      const key = process.env[source.requiresEnv];
      if (!key) throw new Error(`Missing configuration: ${source.requiresEnv}`);
      requestUrl.searchParams.set(source.keyParam, key);
    }
    const response = await fetch(requestUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json, application/rss+xml, application/xml',
      },
      signal: AbortSignal.timeout(timeout),
    });
    const headers = Object.fromEntries(
      [
        'content-type',
        'content-length',
        'content-encoding',
        'etag',
        'last-modified',
        'retry-after',
        'location',
      ].map((key) => [key, response.headers.get(key)]),
    );
    const body = await boundedBody(response, source.maxBytes);
    return {
      url: url.href,
      status: response.status,
      headers,
      body,
      fetchedAt: new Date().toISOString(),
    };
  }
}

async function boundedBody(response, maxBytes) {
  const length = response.headers.get('content-length');
  if (length && Number(length) > maxBytes) {
    await response.body?.cancel();
    throw new Error('Response byte limit exceeded');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Response byte limit exceeded');
    chunks.push(chunk);
  }
  if (
    length &&
    !response.headers.get('content-encoding') &&
    size !== Number(length)
  )
    throw new Error('Truncated response');
  return Buffer.concat(chunks);
}

function retryAfter(value) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp))
    throw new Error('Invalid Retry-After header');
  return Math.max(0, timestamp - Date.now());
}
