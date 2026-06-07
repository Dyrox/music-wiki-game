export const NCM_BASE =
  process.env.NCM_BASE ?? 'https://api-enhanced-gamma-sandy.vercel.app';

export const PORT = Number(process.env.PORT ?? 4000);

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

// Global timed-round length (The-Wiki-Game style): a new shared puzzle every N ms.
export const ROUND_MS = Number(process.env.ROUND_MS ?? 3 * 60 * 1000);

// Cache TTL — artist discographies barely change.
export const ARTIST_TTL_MS = Number(process.env.ARTIST_TTL_MS ?? 6 * 60 * 60 * 1000);
export const SEARCH_TTL_MS = Number(process.env.SEARCH_TTL_MS ?? 60 * 60 * 1000);
