import type {
  Album,
  ArtistData,
  ArtistDesc,
  Challenge,
  CompleteResult,
  Mv,
  PathResult,
  Round,
  RoomState,
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

const appBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const apiBase = `${appBase}/api`;

function apiPath(path: string): string {
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
}

function postJSON(url: string, body: unknown): void {
  // fire-and-forget (heartbeat / completion)
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/** Reliable "I'm leaving" on tab close — sendBeacon survives page unload. */
export function leaveBeacon(clientId: string): void {
  try {
    const blob = new Blob([JSON.stringify({ clientId })], { type: 'application/json' });
    if (!navigator.sendBeacon?.(apiPath('/room/leave'), blob)) {
      postJSON(apiPath('/room/leave'), { clientId });
    }
  } catch {
    /* ignore */
  }
}

// Warm the server cache for an artist we're likely to visit next (hover).
// Deduped so repeated hovers don't refetch.
const prefetched = new Set<number>();
export function prefetchArtist(id: number): void {
  if (prefetched.has(id)) return;
  prefetched.add(id);
  fetch(apiPath(`/artist/${id}`)).catch(() => prefetched.delete(id));
}

export const api = {
  search: (q: string) =>
    getJSON<SearchArtist[]>(apiPath(`/search?q=${encodeURIComponent(q)}`)),
  artist: (id: number, targetId?: number) =>
    getJSON<ArtistData>(
      apiPath(`/artist/${id}${targetId ? `?target=${targetId}` : ''}`),
    ),
  albums: (id: number) => getJSON<Album[]>(apiPath(`/artist/${id}/albums`)),
  mvs: (id: number) => getJSON<Mv[]>(apiPath(`/artist/${id}/mvs`)),
  desc: (id: number) => getJSON<ArtistDesc>(apiPath(`/artist/${id}/desc`)),
  daily: () => getJSON<Challenge>(apiPath(`/challenge/daily`)),
  random: () => getJSON<Challenge>(apiPath(`/challenge/random`)),
  round: () => getJSON<Round>(apiPath(`/round/current`)),
  roundState: () => getJSON<RoundState>(apiPath(`/round/state`)),
  roomState: (start: number, target: number) =>
    getJSON<RoomState>(apiPath(`/room/state?start=${start}&target=${target}`)),
  randomArtist: () => getJSON<SearchArtist>(apiPath(`/random-artist`)),
  heartbeat: (
    clientId: string,
    name: string,
    start: number,
    target: number,
    status: 'browsing' | 'playing',
  ) => postJSON(apiPath(`/room/heartbeat`), { clientId, name, start, target, status }),
  complete: (
    clientId: string,
    name: string,
    start: number,
    target: number,
    moves: number,
    timeMs: number,
    dq: boolean,
  ): Promise<CompleteResult> =>
    fetch(apiPath(`/room/complete`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, name, start, target, moves, timeMs, dq }),
    })
      .then((r) => r.json() as Promise<CompleteResult>)
      .catch(() => ({ rank: null, total: 0 })),
  path: (from: number, to: number) =>
    getJSON<PathResult>(apiPath(`/path?from=${from}&to=${to}&maxDepth=6`)),
};
