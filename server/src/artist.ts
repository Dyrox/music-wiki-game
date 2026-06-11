import { TTLCache } from './cache.js';
import { ncm } from './ncm.js';
import { shortestPath } from './game.js';
import { loadNeighbors, saveNeighbors } from './store.js';
import {
  ARTIST_TTL_MS,
  GRAPH_REFRESH_MS,
  LITE_SONG_LIMIT,
  MAX_SONG_PAGES,
  SONG_PAGE_SIZE,
} from './config.js';
import { mapLimit } from './util.js';
import type {
  Album,
  ArtistData,
  ArtistDesc,
  ArtistRef,
  Mv,
  Neighbor,
  Song,
} from './types.js';

const cache = new TTLCache<ArtistData>(ARTIST_TTL_MS);
const liteCache = new TTLCache<ArtistRef[]>(ARTIST_TTL_MS);
const albumsCache = new TTLCache<Album[]>(ARTIST_TTL_MS);
const mvsCache = new TTLCache<Mv[]>(ARTIST_TTL_MS);
const descCache = new TTLCache<ArtistDesc>(ARTIST_TTL_MS);

/** Albums for the 专辑 tab. */
export function getAlbums(id: number): Promise<Album[]> {
  return albumsCache.wrap(String(id), async () => {
    const r = await ncm<any>('/artist/album', { id, limit: 60 });
    const list: any[] = Array.isArray(r?.hotAlbums) ? r.hotAlbums : [];
    return list.map((a) => ({
      id: a.id,
      name: a.name ?? '',
      picUrl: a.picUrl || a.blurPicUrl || '',
      publishTime: a.publishTime ?? 0,
      size: a.size ?? 0,
    }));
  });
}

/** MVs for the MV tab. */
export function getMvs(id: number): Promise<Mv[]> {
  return mvsCache.wrap(String(id), async () => {
    const r = await ncm<any>('/artist/mv', { id, limit: 60 });
    const list: any[] = Array.isArray(r?.mvs) ? r.mvs : [];
    return list.map((m) => ({
      id: m.id,
      name: m.name ?? '',
      picUrl: m.imgurl || m.imgurl16v9 || '',
      durationMs: m.duration ?? 0,
      playCount: m.playCount ?? 0,
    }));
  });
}

/** Bio for the 歌手详情 tab. */
export function getDesc(id: number): Promise<ArtistDesc> {
  return descCache.wrap(String(id), async () => {
    const r = await ncm<any>('/artist/desc', { id });
    const intro: any[] = Array.isArray(r?.introduction) ? r.introduction : [];
    return {
      briefDesc: r?.briefDesc ?? '',
      sections: intro
        .filter((s) => s && s.txt)
        .map((s) => ({ ti: s.ti ?? '', txt: s.txt ?? '' })),
    };
  });
}
const briefCache = new TTLCache<{ id: number; name: string; picUrl: string }>(ARTIST_TTL_MS);

/** Just name + avatar for an artist (one cheap call) — used for round tiles. */
export function getArtistBrief(
  id: number,
): Promise<{ id: number; name: string; picUrl: string }> {
  return briefCache.wrap(String(id), async () => {
    const info = await ncm<any>('/artists', { id });
    const a = info?.artist ?? {};
    return { id, name: a.name ?? '', picUrl: a.picUrl || a.img1v1Url || '' };
  });
}

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

/**
 * Full (capped) discography. The upstream is slow (~3-4s/call), so we fire all
 * pages concurrently instead of waiting on page 0's `total` — one round-trip of
 * latency instead of two. Pages past the end just come back empty.
 */
async function fetchAllRawSongs(id: number): Promise<any[]> {
  const offsets: number[] = [];
  for (let p = 0; p < MAX_SONG_PAGES; p++) offsets.push(p * SONG_PAGE_SIZE);
  const pages = await mapLimit(offsets, MAX_SONG_PAGES, (off) =>
    fetchSongPage(id, off)
      .then((r) => r.songs)
      .catch(() => []),
  );
  return pages.flat();
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

  const neighbors = buildNeighbors(id, songs);
  saveNeighbors(id, 'full', neighbors.map((n) => ({ id: n.artistId, name: n.name })));

  return {
    id,
    name: artist.name ?? '',
    alias: Array.isArray(artist.alias) ? artist.alias.filter(Boolean) : [],
    trans: artist.trans ?? '',
    picUrl: artist.picUrl || artist.img1v1Url || '',
    briefDesc: artist.briefDesc ?? '',
    musicSize: artist.musicSize ?? songs.length,
    albumSize: artist.albumSize ?? 0,
    mvSize: artist.mvSize ?? 0,
    songs,
    neighbors,
  };
}

export function getArtist(id: number): Promise<ArtistData> {
  return cache.wrap(String(id), () => fetchArtist(id));
}

/** Songs in `otherId`'s discography that credit BOTH artists (the shared edge). */
async function bridgeSongs(currentId: number, otherId: number): Promise<Song[]> {
  const other = await getArtist(otherId);
  return other.songs.filter(
    (s) =>
      s.artists.some((a) => a.id === currentId) &&
      s.artists.some((a) => a.id === otherId),
  );
}

/**
 * Artist page aware of the game's target. A collaboration song credits BOTH
 * artists, so an edge lives in both discographies — but for a "hub" artist
 * (e.g. the 可不/KAFU voicebank, 4000+ songs) the connecting song can sit past
 * our hot-song cap, while on the smaller collaborator it's near the top. When
 * this artist's capped list doesn't reach the target, we recover the next step:
 * the direct edge to the target if there is one, otherwise the next waypoint on
 * the shortest path (so a multi-hop route out of the hub stays walkable). The
 * recovered song is spliced back in and shows up like any other edge.
 */
export async function getArtistWithTarget(
  id: number,
  targetId: number,
): Promise<ArtistData> {
  const base = await getArtist(id);
  if (!targetId || targetId === id) return base;
  // already a visible edge to the target — nothing to recover
  if (base.neighbors.some((n) => n.artistId === targetId)) return base;
  // a complete (non-truncated) discography hides nothing recoverable
  if (base.musicSize <= base.songs.length) return base;

  // direct edge first (target shallow on its own side)…
  let bridges = await bridgeSongs(id, targetId);
  if (bridges.length === 0) {
    // …else the target is 2+ hops away: recover the next waypoint's edge so the
    // page still offers a step toward the goal.
    const path = await shortestPath(id, targetId);
    if (!path || path.length < 2 || path[1] === targetId) return base;
    const hop = path[1];
    if (base.neighbors.some((n) => n.artistId === hop)) return base; // already visible
    bridges = await bridgeSongs(id, hop);
  }
  if (bridges.length === 0) return base;

  // Tuck the recovered shortcut into the last 5–10% of the list rather than the
  // very top — it should still have to be hunted for like a genuine deep collab,
  // not handed over at #1. A small id-derived offset avoids a predictable index.
  const seen = new Set(bridges.map((s) => s.id));
  const rest = base.songs.filter((s) => !seen.has(s.id));
  const frac = 0.9 + (bridges[0].id % 50) / 1000; // 0.90–0.949
  const at = Math.floor(rest.length * frac);
  const songs = [...rest.slice(0, at), ...bridges, ...rest.slice(at)];
  return { ...base, songs, neighbors: buildNeighbors(id, songs) };
}

/**
 * Cheap neighbor view for BFS: just the top page of songs, collaborators sorted
 * by how many songs connect them. Keeps challenge generation / hints fast and
 * biased toward popular (easy-to-find) edges.
 *
 * Backed by the persistent graph store: a fresh-enough stored copy skips the
 * upstream entirely, and a stale copy still beats failing when upstream is down.
 */
export function liteNeighbors(id: number): Promise<ArtistRef[]> {
  return liteCache.wrap(String(id), async () => {
    const stored = loadNeighbors(id, 'lite');
    if (stored && Date.now() - stored.fetchedAt < GRAPH_REFRESH_MS) return stored.refs;
    try {
      const refs = await fetchLiteNeighbors(id);
      saveNeighbors(id, 'lite', refs);
      return refs;
    } catch (e) {
      if (stored) return stored.refs;
      throw e;
    }
  });
}

async function fetchLiteNeighbors(id: number): Promise<ArtistRef[]> {
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
}
