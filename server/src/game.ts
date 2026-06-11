import { getArtist, getArtistBrief, liteNeighbors } from './artist.js';
import { loadNeighbors } from './store.js';
import {
  BFS_FETCH_BUDGET,
  BFS_MAX_DEPTH,
  BFS_NEIGHBOR_CAP,
  GRAPH_REFRESH_MS,
} from './config.js';
import { mapLimit } from './util.js';

/** Collaboration neighbors of an artist, capped for bounded search. */
async function neighborRefsOf(id: number) {
  try {
    return (await liteNeighbors(id)).slice(0, BFS_NEIGHBOR_CAP);
  } catch {
    return [];
  }
}

/**
 * ALL collaborators of an artist (full discography), sorted by collab count.
 * A fresh persisted copy answers in microseconds; otherwise we pay the full
 * 5-call getArtist fetch (which writes the copy back for next time).
 */
async function fullNeighborIds(id: number): Promise<number[]> {
  const stored = loadNeighbors(id, 'full');
  if (stored && Date.now() - stored.fetchedAt < GRAPH_REFRESH_MS) {
    return stored.refs.map((r) => r.id);
  }
  try {
    return (await getArtist(id)).neighbors.map((n) => n.artistId);
  } catch {
    return stored ? stored.refs.map((r) => r.id) : [];
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
 * Breadth-first shortest path through the collaboration graph, bidirectional:
 * growing a frontier from both ends meets in the middle after ~2·b^(d/2)
 * expansions instead of b^d — for cap 14 / depth 4 that's ~400 node fetches
 * versus ~3000, and a depth-5 search stays feasible at all. Expansion uses the
 * cheap lite view (popular, findable edges) so hints stay walkable in-game.
 * Returns null if no path within maxDepth / fetch budget.
 */
export async function findPath(
  from: number,
  to: number,
  maxDepth = BFS_MAX_DEPTH,
  fetchBudget = BFS_FETCH_BUDGET,
): Promise<PathResult | null> {
  // endpoint names can't be picked up from neighbor refs, so fetch them cheaply
  const nameOf = new Map<number, string>();
  const briefs = await Promise.all(
    [from, to].map((id) => getArtistBrief(id).catch(() => ({ id, name: '' }))),
  );
  for (const b of briefs) nameOf.set(b.id, b.name);

  const toResult = (ids: number[]): PathResult => ({
    path: ids.map((id) => ({ id, name: nameOf.get(id) ?? '' })),
    moves: ids.length - 1,
  });

  if (from === to) return toResult([from]);

  const aParent = new Map<number, number>([[from, -1]]);
  const bParent = new Map<number, number>([[to, -1]]);
  let aFront = [from];
  let bFront = [to];
  let aLevel = 0;
  let bLevel = 0;
  let fetched = 0;

  // stitch a meeting edge u(start side) — v(target side) into a full id path
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

    if (fetched + front.length > fetchBudget) break;
    fetched += front.length;

    const lists = await mapLimit(front, 12, async (nid) => ({
      nid,
      nbs: await neighborRefsOf(nid),
    }));

    const nextFront: number[] = [];
    let best: number[] | null = null;

    for (const { nid, nbs } of lists) {
      for (const nb of nbs) {
        if (!nameOf.has(nb.id)) nameOf.set(nb.id, nb.name);
        if (parentOther.has(nb.id)) {
          const ids = expandA ? stitch(nid, nb.id) : stitch(nb.id, nid);
          if (!best || ids.length < best.length) best = ids;
        }
        if (!parentSelf.has(nb.id)) {
          parentSelf.set(nb.id, nid);
          nextFront.push(nb.id);
        }
      }
    }
    if (best) return toResult(best);

    if (expandA) {
      aFront = nextFront;
      aLevel++;
    } else {
      bFront = nextFront;
      bLevel++;
    }
  }
  return null;
}
