import { TTLCache } from './cache.js';
import { ncm } from './ncm.js';
import { SEARCH_TTL_MS } from './config.js';

export interface ArtistSearchResult {
  id: number;
  name: string;
  picUrl: string;
  alias: string[];
  musicSize: number;
}

const cache = new TTLCache<ArtistSearchResult[]>(SEARCH_TTL_MS);

export function searchArtists(keywords: string): Promise<ArtistSearchResult[]> {
  const q = keywords.trim();
  if (!q) return Promise.resolve([]);
  return cache.wrap(q.toLowerCase(), async () => {
    const resp = await ncm<any>('/cloudsearch', { keywords: q, type: 100, limit: 30 });
    const artists: any[] = resp?.result?.artists ?? [];
    return artists.map((a) => ({
      id: a.id,
      name: a.name,
      picUrl: a.picUrl ?? a.img1v1Url ?? '',
      alias: [...(a.alias ?? []), ...(a.alia ?? [])].filter(Boolean),
      musicSize: a.musicSize ?? 0,
    }));
  });
}
