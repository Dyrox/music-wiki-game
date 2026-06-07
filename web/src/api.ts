import type {
  Album,
  ArtistData,
  ArtistDesc,
  Challenge,
  Mv,
  PathResult,
  Round,
  RoundState,
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

function postJSON(url: string, body: unknown): void {
  // fire-and-forget (heartbeat / completion)
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
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
  albums: (id: number) => getJSON<Album[]>(`/api/artist/${id}/albums`),
  mvs: (id: number) => getJSON<Mv[]>(`/api/artist/${id}/mvs`),
  desc: (id: number) => getJSON<ArtistDesc>(`/api/artist/${id}/desc`),
  daily: () => getJSON<Challenge>(`/api/challenge/daily`),
  random: () => getJSON<Challenge>(`/api/challenge/random`),
  round: () => getJSON<Round>(`/api/round/current`),
  roundState: () => getJSON<RoundState>(`/api/round/state`),
  heartbeat: (
    clientId: string,
    name: string,
    roundId: number,
    status: 'browsing' | 'playing',
  ) => postJSON(`/api/round/heartbeat`, { clientId, name, roundId, status }),
  complete: (
    clientId: string,
    name: string,
    roundId: number,
    moves: number,
    timeMs: number,
  ) => postJSON(`/api/round/complete`, { clientId, name, roundId, moves, timeMs }),
  path: (from: number, to: number) =>
    getJSON<PathResult>(`/api/path?from=${from}&to=${to}&maxDepth=6`),
};
