import type {
  ArtistData,
  Challenge,
  PathResult,
  Round,
  SearchArtist,
} from './types';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error ?? `请求失败 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Warm the server cache for an artist we're likely to visit next (hover).
// Deduped so repeated hovers don't refetch.
const prefetched = new Set<number>();
export function prefetchArtist(id: number): void {
  if (prefetched.has(id)) return;
  prefetched.add(id);
  fetch(`/api/artist/${id}`).catch(() => prefetched.delete(id));
}

export const api = {
  search: (q: string) =>
    getJSON<SearchArtist[]>(`/api/search?q=${encodeURIComponent(q)}`),
  artist: (id: number) => getJSON<ArtistData>(`/api/artist/${id}`),
  daily: () => getJSON<Challenge>(`/api/challenge/daily`),
  random: () => getJSON<Challenge>(`/api/challenge/random`),
  round: () => getJSON<Round>(`/api/round/current`),
  path: (from: number, to: number) =>
    getJSON<PathResult>(`/api/path?from=${from}&to=${to}&maxDepth=6`),
};
