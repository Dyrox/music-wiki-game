import { TTLCache } from './cache.js';
import { ncm } from './ncm.js';
import {
  ARTIST_TTL_MS,
  LITE_SONG_LIMIT,
  MAX_SONG_PAGES,
  SONG_PAGE_SIZE,
} from './config.js';
import { mapLimit } from './util.js';
import type { ArtistData, ArtistRef, Neighbor, Song } from './types.js';

const cache = new TTLCache<ArtistData>(ARTIST_TTL_MS);
const liteCache = new TTLCache<ArtistRef[]>(ARTIST_TTL_MS);

function normalizeSong(raw: any): Song | null {
  if (!raw || typeof raw.id !== 'number') return null;
  const al = raw.al ?? {};
  return {
    id: raw.id,
    name: raw.name ?? '',
    alia: Array.isArray(raw.alia) ? raw.alia.filter(Boolean) : [],
    album: { id: al.id ?? 0, name: al.name ?? '', picUrl: al.picUrl ?? '' },
    artists: cleanArtists(raw.ar),
    durationMs: typeof raw.dt === 'number' ? raw.dt : 0,
    fee: typeof raw.fee === 'number' ? raw.fee : 0,
    hasMv: typeof raw.mv === 'number' && raw.mv > 0,
  };
}

function cleanArtists(ar: any): ArtistRef[] {
  return Array.isArray(ar)
    ? ar
        .filter((a: any) => a && typeof a.id === 'number' && a.id > 0 && a.name)
        .map((a: any) => ({ id: a.id, name: a.name }))
    : [];
}

async function fetchSongPage(
  id: number,
  offset: number,
  limit = SONG_PAGE_SIZE,
): Promise<{ songs: any[]; total: number }> {
  const r = await ncm<any>('/artist/songs', { id, order: 'hot', limit, offset });
  return { songs: Array.isArray(r?.songs) ? r.songs : [], total: r?.total ?? 0 };
}

/** Full (capped) discography via deterministic offset pagination. */
async function fetchAllRawSongs(id: number): Promise<any[]> {
  const first = await fetchSongPage(id, 0);
  const total = first.total || first.songs.length;
  const pages = Math.min(MAX_SONG_PAGES, Math.ceil(total / SONG_PAGE_SIZE));
  const offsets: number[] = [];
  for (let p = 1; p < pages; p++) offsets.push(p * SONG_PAGE_SIZE);
  const rest = await mapLimit(offsets, 5, (off) => fetchSongPage(id, off).then((r) => r.songs));
  return [first.songs, ...rest].flat();
}

function buildNeighbors(selfId: number, songs: Song[]): Neighbor[] {
  const byArtist = new Map<number, Neighbor>();
  for (const song of songs) {
    if (song.artists.length < 2) continue; // not a collaboration -> not an edge
    for (const a of song.artists) {
      if (a.id === selfId) continue;
      let n = byArtist.get(a.id);
      if (!n) {
        n = { artistId: a.id, name: a.name, viaSongs: [] };
        byArtist.set(a.id, n);
      }
      if (!n.viaSongs.some((s) => s.id === song.id)) {
        n.viaSongs.push({ id: song.id, name: song.name, picUrl: song.album.picUrl });
      }
    }
  }
  return [...byArtist.values()].sort((a, b) => b.viaSongs.length - a.viaSongs.length);
}

async function fetchArtist(id: number): Promise<ArtistData> {
  const [info, rawSongs] = await Promise.all([
    ncm<any>('/artists', { id }),
    fetchAllRawSongs(id),
  ]);

  const artist = info?.artist ?? {};
  const all: any[] = [...rawSongs, ...(Array.isArray(info?.hotSongs) ? info.hotSongs : [])];

  const seen = new Set<number>();
  const songs: Song[] = [];
  for (const raw of all) {
    const s = normalizeSong(raw);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    songs.push(s);
  }

  return {
    id,
    name: artist.name ?? '',
    alias: Array.isArray(artist.alias) ? artist.alias.filter(Boolean) : [],
    trans: artist.trans ?? '',
    picUrl: artist.picUrl ?? artist.img1v1Url ?? '',
    briefDesc: artist.briefDesc ?? '',
    musicSize: artist.musicSize ?? songs.length,
    albumSize: artist.albumSize ?? 0,
    mvSize: artist.mvSize ?? 0,
    songs,
    neighbors: buildNeighbors(id, songs),
  };
}

export function getArtist(id: number): Promise<ArtistData> {
  return cache.wrap(String(id), () => fetchArtist(id));
}

/**
 * Cheap neighbor view for BFS: just the top page of songs, collaborators sorted
 * by how many songs connect them. Keeps challenge generation / hints fast and
 * biased toward popular (easy-to-find) edges.
 */
export function liteNeighbors(id: number): Promise<ArtistRef[]> {
  return liteCache.wrap(String(id), async () => {
    const { songs } = await fetchSongPage(id, 0, LITE_SONG_LIMIT);
    const count = new Map<number, { ref: ArtistRef; n: number }>();
    for (const raw of songs) {
      const artists = cleanArtists(raw.ar);
      if (artists.length < 2) continue;
      for (const a of artists) {
        if (a.id === id) continue;
        const e = count.get(a.id);
        if (e) e.n++;
        else count.set(a.id, { ref: a, n: 1 });
      }
    }
    return [...count.values()].sort((a, b) => b.n - a.n).map((e) => e.ref);
  });
}
