import { TTLCache } from './cache.js';
import { ROUND_MS } from './config.js';
import { generateSeeded } from './challenge.js';
import { getArtistBrief } from './artist.js';

interface Tile {
  id: number;
  name: string;
  picUrl: string;
}

interface RoundCore {
  roundId: number;
  start: Tile;
  target: Tile;
  minMoves: number;
}

export interface Round extends RoundCore {
  durationMs: number;
  startsAt: number;
  endsAt: number;
  serverNow: number;
}

// Rounds rotate by id, so a short-ish TTL plus the id key is enough.
const cache = new TTLCache<RoundCore>(2 * ROUND_MS, 50);

export function roundIdFor(t: number = Date.now()): number {
  return Math.floor(t / ROUND_MS);
}

async function buildRound(roundId: number): Promise<RoundCore> {
  const c = await generateSeeded('round:' + roundId, { min: 2, max: 4 });
  const [s, t] = await Promise.all([
    getArtistBrief(c.start.id),
    getArtistBrief(c.target.id),
  ]);
  return {
    roundId,
    start: { id: c.start.id, name: c.start.name || s.name, picUrl: s.picUrl },
    target: { id: c.target.id, name: c.target.name || t.name, picUrl: t.picUrl },
    minMoves: c.minMoves,
  };
}

function getRound(roundId: number): Promise<RoundCore> {
  return cache.wrap(String(roundId), () => buildRound(roundId));
}

export async function currentRound(): Promise<Round> {
  const roundId = roundIdFor();
  const core = await getRound(roundId);
  return {
    ...core,
    durationMs: ROUND_MS,
    startsAt: roundId * ROUND_MS,
    endsAt: (roundId + 1) * ROUND_MS,
    serverNow: Date.now(),
  };
}

/** Make sure the current and next rounds are generated ahead of time. */
export async function ensureRounds(): Promise<void> {
  const id = roundIdFor();
  await getRound(id).catch((e) =>
    console.error('[round] build current failed:', (e as Error)?.message ?? e),
  );
  void getRound(id + 1).catch(() => {}); // next, in the background
}
