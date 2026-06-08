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

/** ALL collaborators of an artist (full discography), sorted by collab count. */
async function fullNeighborIds(id: number): Promise<number[]> {
  try {
    return (await getArtist(id)).neighbors.map((n) => n.artistId);
  } catch {
    return [];
  }
}

/**
 * EXACT shortest distance between two artists over the full collaboration graph,
 * via bidirectional BFS. Used to report an honest "最少 N 步" for puzzles — the
 * cheap lite/capped BFS over-estimates because it prunes one-off collabs.
 *
 * Meet detection uses the complete neighbor set (so distances 1–2 are always
 * exact); deeper expansion is capped per node and bounded by a fetch budget so
 * cost stays sane. Returns null if not found within maxDepth / budget (callers
 * fall back to the cheap estimate).
 */
export async function shortestDistance(
  start: number,
  target: number,
  maxDepth = 5,
  expandCap = 50,
  fetchBudget = 220,
): Promise<number | null> {
  if (start === target) return 0;

  const aDist = new Map<number, number>([[start, 0]]);
  const bDist = new Map<number, number>([[target, 0]]);
  let aFront = [start];
  let bFront = [target];
  let aLevel = 0;
  let bLevel = 0;
  let fetched = 0;

  while (aFront.length && bFront.length && aLevel + bLevel < maxDepth) {
    const expandA = aFront.length <= bFront.length;
    const front = expandA ? aFront : bFront;
    const distSelf = expandA ? aDist : bDist;
    const distOther = expandA ? bDist : aDist;
    const nd = (expandA ? aLevel : bLevel) + 1;

    if (fetched + front.length > fetchBudget) return null; // give up -> caller falls back
    fetched += front.length;

    const lists = await mapLimit(front, 16, fullNeighborIds);
    const nextFront: number[] = [];
    let met: number | null = null;

    for (const list of lists) {
      let pushed = 0;
      for (const nb of list) {
        const other = distOther.get(nb);
        if (other !== undefined) {
          const total = nd + other;
          met = met === null ? total : Math.min(met, total);
        }
        if (!distSelf.has(nb)) {
          distSelf.set(nb, nd);
          if (pushed < expandCap) {
            nextFront.push(nb);
            pushed++;
          }
        }
      }
    }
    if (met !== null) return met;

    if (expandA) {
      aFront = nextFront;
      aLevel = nd;
    } else {
      bFront = nextFront;
      bLevel = nd;
    }
  }
  return null;
}

/**
 * Like shortestDistance, but returns the actual id path (start..target) via
 * bidirectional BFS over the FULL neighbor graph. Used to recover the next
 * waypoint when leaving a "hub" artist whose connecting song is buried past the
 * hot-song cap: the buried edge start→W is invisible from start's own list, but
 * the search still finds W because W's (smaller) list links back to start.
 * Returns null if no path within maxDepth / fetch budget.
 */
export async function shortestPath(
  start: number,
  target: number,
  maxDepth = 6,
  expandCap = 40,
  fetchBudget = 200,
): Promise<number[] | null> {
  if (start === target) return [start];

  const aParent = new Map<number, number>([[start, -1]]);
  const bParent = new Map<number, number>([[target, -1]]);
  let aFront = [start];
  let bFront = [target];
  let aLevel = 0;
  let bLevel = 0;
  let fetched = 0;

  // stitch a meeting edge u(start side) — v(target side) into a full path
  const stitch = (u: number, v: number): number[] => {
    const left: number[] = [];
    for (let c = u; c !== -1; c = aParent.get(c) ?? -1) left.push(c);
    left.reverse();
    const right: number[] = [];
    for (let c = v; c !== -1; c = bParent.get(c) ?? -1) right.push(c);
    return [...left, ...right];
  };

  while (aFront.length && bFront.length && aLevel + bLevel < maxDepth) {
    const expandA = aFront.length <= bFront.length;
    const front = expandA ? aFront : bFront;
    const parentSelf = expandA ? aParent : bParent;
    const parentOther = expandA ? bParent : aParent;
    const nd = (expandA ? aLevel : bLevel) + 1;

    if (fetched + front.length > fetchBudget) return null;
    fetched += front.length;

    const lists = await mapLimit(front, 16, async (nid) => ({
      nid,
      nbs: await fullNeighborIds(nid),
    }));

    const nextFront: number[] = [];
    let best: { path: number[]; total: number } | null = null;

    for (const { nid, nbs } of lists) {
      let pushed = 0;
      for (const nb of nbs) {
        if (parentOther.has(nb)) {
          const path = expandA ? stitch(nid, nb) : stitch(nb, nid);
          const total = path.length - 1;
          if (!best || total < best.total) best = { path, total };
        }
        if (!parentSelf.has(nb)) {
          parentSelf.set(nb, nid);
          if (pushed < expandCap) {
            nextFront.push(nb);
            pushed++;
          }
        }
      }
    }
    if (best) return best.path;

    if (expandA) {
      aFront = nextFront;
      aLevel = nd;
    } else {
      bFront = nextFront;
      bLevel = nd;
    }
  }
  return null;
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
    const expanded = await mapLimit(frontier, 12, async (nid) => ({
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
