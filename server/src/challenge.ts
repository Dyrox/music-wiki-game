import { liteNeighbors } from './artist.js';
import { mapLimit } from './util.js';
import { SEEDS } from './seeds.js';

export interface Challenge {
  mode: 'daily' | 'random';
  date?: string;
  start: { id: number; name: string };
  target: { id: number; name: string };
  /** shortest number of moves the generator found (a lower bound for the player) */
  minMoves: number;
}

// ---- deterministic RNG (so a given date always yields the same puzzle) ----
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Reachable {
  id: number;
  name: string;
  depth: number;
}

/**
 * Bounded BFS out from `start`, recording each artist's BFS depth. Capped by a
 * fetch budget and per-node neighbor cap so generation stays cheap.
 */
async function boundedReachable(
  start: number,
  startName: string,
  opts: { neighborCap: number; nodeBudget: number; maxDepth: number },
): Promise<Map<number, Reachable>> {
  const seen = new Map<number, Reachable>();
  seen.set(start, { id: start, name: startName, depth: 0 });

  let frontier = [start];
  let fetched = 0;
  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    if (frontier.length === 0 || fetched >= opts.nodeBudget) break;
    const batch = frontier.slice(0, opts.nodeBudget - fetched);
    fetched += batch.length;

    const results = await mapLimit(batch, 8, (nid) =>
      liteNeighbors(nid).catch(() => []),
    );

    const next: number[] = [];
    for (const refs of results) {
      for (const n of refs.slice(0, opts.neighborCap)) {
        if (seen.has(n.id)) continue;
        seen.set(n.id, { id: n.id, name: n.name, depth });
        next.push(n.id);
      }
    }
    frontier = next;
  }
  return seen;
}

async function generateFromStart(
  startId: number,
  startName: string,
  rng: () => number,
  range: { min: number; max: number },
): Promise<{ start: Reachable; target: Reachable; minMoves: number } | null> {
  const reach = await boundedReachable(startId, startName, {
    neighborCap: 6,
    nodeBudget: 40,
    maxDepth: range.max,
  });
  const start = reach.get(startId);
  if (!start) return null;

  const seedIds = new Set(SEEDS.map((s) => s.id));
  const inRange = [...reach.values()].filter(
    (r) => r.depth >= range.min && r.depth <= range.max,
  );
  // prefer recognizable targets (from the seed pool); fall back to anything in range
  let pool = inRange.filter((r) => seedIds.has(r.id));
  if (pool.length === 0) pool = inRange;
  if (pool.length === 0) return null;

  pool.sort((a, b) => a.depth - b.depth || a.id - b.id); // stable order for determinism
  const pick = pool[Math.floor(rng() * pool.length)];
  return { start, target: pick, minMoves: pick.depth };
}

const dailyCache = new Map<string, Challenge>();

export function todayStr(): string {
  // local date YYYY-MM-DD
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export async function dailyChallenge(date = todayStr()): Promise<Challenge> {
  const cached = dailyCache.get(date);
  if (cached) return cached;

  const rng = mulberry32(hashStr('mwg:' + date));
  const order = [...SEEDS].sort(() => rng() - 0.5); // deterministic shuffle of start candidates

  for (const seed of order) {
    const res = await generateFromStart(seed.id, seed.name, rng, { min: 2, max: 4 });
    if (res) {
      const challenge: Challenge = {
        mode: 'daily',
        date,
        start: { id: res.start.id, name: res.start.name },
        target: { id: res.target.id, name: res.target.name },
        minMoves: res.minMoves,
      };
      dailyCache.set(date, challenge);
      return challenge;
    }
  }
  throw new Error('failed to generate daily challenge');
}

export async function randomChallenge(): Promise<Challenge> {
  const rng = () => Math.random();
  for (let attempt = 0; attempt < SEEDS.length; attempt++) {
    const seed = SEEDS[Math.floor(rng() * SEEDS.length)];
    const res = await generateFromStart(seed.id, seed.name, rng, { min: 2, max: 5 });
    if (res && res.target.id !== res.start.id) {
      return {
        mode: 'random',
        start: { id: res.start.id, name: res.start.name },
        target: { id: res.target.id, name: res.target.name },
        minMoves: res.minMoves,
      };
    }
  }
  throw new Error('failed to generate random challenge');
}
