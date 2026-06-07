import type {
  ArtistData,
  Challenge,
  PathResult,
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

export const api = {
  search: (q: string) =>
    getJSON<SearchArtist[]>(`/api/search?q=${encodeURIComponent(q)}`),
  artist: (id: number) => getJSON<ArtistData>(`/api/artist/${id}`),
  daily: () => getJSON<Challenge>(`/api/challenge/daily`),
  random: () => getJSON<Challenge>(`/api/challenge/random`),
  path: (from: number, to: number) =>
    getJSON<PathResult>(`/api/path?from=${from}&to=${to}&maxDepth=6`),
};
