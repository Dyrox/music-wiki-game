import { TTLCache } from './cache.js';
import { ROUND_MS, ROUND_PREFETCH_COUNT } from './config.js';
import { generateVerified } from './challenge.js';
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

// Keep prefetched rounds alive until they become current.
const cache = new TTLCache<RoundCore>((ROUND_PREFETCH_COUNT + 2) * ROUND_MS, 50);
let ensuring = false;

export function roundIdFor(t: number = Date.now()): number {
  return Math.floor(t / ROUND_MS);
}

async function buildRound(roundId: number): Promise<RoundCore> {
  const c = await generateVerified('round:' + roundId, { min: 3, max: 5 });
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
  void ensureRounds(); // keep future rounds warm after serving the current one
  return {
    ...core,
    durationMs: ROUND_MS,
    startsAt: roundId * ROUND_MS,
    endsAt: (roundId + 1) * ROUND_MS,
    serverNow: Date.now(),
  };
}

/** Make sure the current and upcoming rounds are generated ahead of time. */
export async function ensureRounds(): Promise<void> {
  if (ensuring) return;
  ensuring = true;
  const id = roundIdFor();
  try {
    for (let i = 0; i <= ROUND_PREFETCH_COUNT; i++) {
      const roundId = id + i;
      await getRound(roundId).catch((e) =>
        console.error(
          `[round] build #${roundId} failed:`,
          (e as Error)?.message ?? e,
        ),
      );
    }
  } finally {
    ensuring = false;
  }
}
