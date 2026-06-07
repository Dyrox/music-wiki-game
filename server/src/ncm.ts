import { NCM_BASE } from './config.js';

export class NcmError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'NcmError';
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * Call the hosted api-enhanced instance. Adds a timeout + one retry, and
 * `realIP` to reduce the chance of the upstream rate-limiting our Vercel host.
 */
export async function ncm<T = any>(path: string, params: Params = {}): Promise<T> {
  const url = new URL(path, NCM_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  // A China IP helps some endpoints; harmless for the rest.
  if (!url.searchParams.has('realIP')) url.searchParams.set('realIP', '116.25.146.177');

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'music-wiki-game/0.1' },
      });
      clearTimeout(timer);
      if (!res.ok) throw new NcmError(`upstream ${res.status} for ${path}`, res.status);
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new NcmError(`request failed for ${path}`);
}
