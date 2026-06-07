import { getArtist, liteNeighbors } from './artist.js';
import { BFS_MAX_DEPTH, BFS_NEIGHBOR_CAP } from './config.js';
import { mapLimit } from './util.js';

/** Collaboration neighbors of an artist, capped for bounded search. */
async function neighborRefsOf(id: number) {
  try {
    return (await liteNeighbors(id)).slice(0, BFS_NEIGHBOR_CAP);
  } catch {
    return [];
  }
}

export interface PathResult {
  path: { id: number; name: string }[];
  moves: number;
}

/**
 * Breadth-first shortest path through the collaboration graph.
 * Returns null if no path within maxDepth.
 */
export async function findPath(
  from: number,
  to: number,
  maxDepth = BFS_MAX_DEPTH,
): Promise<PathResult | null> {
  if (from === to) {
    const a = await getArtist(from);
    return { path: [{ id: from, name: a.name }], moves: 0 };
  }

  const parent = new Map<number, number>();
  const nameOf = new Map<number, string>();
  parent.set(from, -1);
  try {
    nameOf.set(from, (await getArtist(from)).name);
  } catch {
    /* leave start name blank */
  }
  let frontier = [from];

  for (let depth = 0; depth < maxDepth; depth++) {
    if (frontier.length === 0) break;
    const expanded = await mapLimit(frontier, 6, async (nid) => ({
      nid,
      neighbors: await neighborRefsOf(nid),
    }));

    const next: number[] = [];
    for (const { nid, neighbors } of expanded) {
      for (const nb of neighbors) {
        if (parent.has(nb.id)) continue;
        parent.set(nb.id, nid);
        nameOf.set(nb.id, nb.name);
        if (nb.id === to) return reconstruct(parent, nameOf, from, to);
        next.push(nb.id);
      }
    }
    frontier = next;
  }
  return null;
}

function reconstruct(
  parent: Map<number, number>,
  nameOf: Map<number, string>,
  from: number,
  to: number,
): PathResult {
  const ids: number[] = [];
  let cur = to;
  while (cur !== -1) {
    ids.push(cur);
    cur = parent.get(cur) ?? -1;
  }
  ids.reverse();
  return {
    path: ids.map((id) => ({ id, name: nameOf.get(id) ?? '' })),
    moves: ids.length - 1,
  };
}
