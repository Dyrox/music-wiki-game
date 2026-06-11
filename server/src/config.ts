import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const NCM_BASE =
  process.env.NCM_BASE ?? 'https://api-enhanced-gamma-sandy.vercel.app';

export const PORT = Number(process.env.PORT ?? 4000);
export const WEB_DIST_DIR = process.env.WEB_DIST_DIR;

// The upstream caps a single /artist/songs call, and its `hot` order is only
// stable when paged by offset — so we paginate. 100 per page, up to MAX pages.
export const SONG_PAGE_SIZE = Number(process.env.SONG_PAGE_SIZE ?? 100);
export const MAX_SONG_PAGES = Number(process.env.MAX_SONG_PAGES ?? 4); // up to 400 songs

// BFS uses a cheaper "lite" view (just the top page) so daily/random generation
// and hints stay fast and prefer findable (popular) collaboration edges.
export const LITE_SONG_LIMIT = Number(process.env.LITE_SONG_LIMIT ?? 100);

// BFS limits so pathfinding stays bounded in API calls.
export const BFS_MAX_DEPTH = Number(process.env.BFS_MAX_DEPTH ?? 5);
export const BFS_NEIGHBOR_CAP = Number(process.env.BFS_NEIGHBOR_CAP ?? 14);
// Max node expansions per findPath call (bidirectional worst case at depth 5
// with cap 14 is ~450, so this only trips on pathological pairs).
export const BFS_FETCH_BUDGET = Number(process.env.BFS_FETCH_BUDGET ?? 500);

// Persistent adjacency store: collaboration edges barely change, so neighbor
// lists are kept on disk forever and only re-fetched once they get this old
// (failures fall back to the stored copy — stale data beats a dead search).
export const GRAPH_DB_PATH =
  process.env.GRAPH_DB_PATH ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/graph.db');
export const GRAPH_REFRESH_MS = Number(
  process.env.GRAPH_REFRESH_MS ?? 7 * 24 * 60 * 60 * 1000,
);

// Global timed-round length (The-Wiki-Game style): a new shared puzzle every N ms.
export const ROUND_MS = Number(process.env.ROUND_MS ?? 3 * 60 * 1000);
export const ROUND_PREFETCH_COUNT = Number(process.env.ROUND_PREFETCH_COUNT ?? 4);

// Cache TTL — artist discographies barely change.
export const ARTIST_TTL_MS = Number(process.env.ARTIST_TTL_MS ?? 6 * 60 * 60 * 1000);
export const SEARCH_TTL_MS = Number(process.env.SEARCH_TTL_MS ?? 60 * 60 * 1000);
