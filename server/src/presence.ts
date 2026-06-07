import { ROUND_MS } from './config.js';

/**
 * Lightweight, in-memory "who's playing right now" + per-round results, in the
 * spirit of The Wiki Game's lobby. Real visitors are tracked via heartbeats;
 * a handful of deterministic bots per round keep the board lively (toggle with
 * env BOTS=off). Everything resets on server restart — no DB, prototype-grade.
 */

export type PlayerStatus = 'browsing' | 'playing' | 'done';

export interface LivePlayer {
  name: string;
  status: PlayerStatus;
  bot?: boolean;
}

export interface RoundResult {
  name: string;
  moves: number;
  timeMs: number;
  bot?: boolean;
}

interface RealPlayer {
  name: string;
  roundId: number;
  status: PlayerStatus;
  lastSeen: number;
}

const ONLINE_TTL = 12_000;
// Real players only by default. Set BOTS=on to add filler bots for demos.
const BOTS_ENABLED = (process.env.BOTS ?? 'off') === 'on';

const realPlayers = new Map<string, RealPlayer>(); // key: name
const realResults = new Map<number, Map<string, RoundResult>>(); // roundId -> name -> result

export function heartbeat(name: string, roundId: number, status: PlayerStatus): void {
  if (!name) return;
  realPlayers.set(name, { name, roundId, status, lastSeen: Date.now() });
}

export function complete(
  name: string,
  roundId: number,
  moves: number,
  timeMs: number,
): void {
  if (!name) return;
  let m = realResults.get(roundId);
  if (!m) {
    m = new Map();
    realResults.set(roundId, m);
  }
  const prev = m.get(name);
  // keep the best attempt (fewer moves, then faster)
  if (!prev || moves < prev.moves || (moves === prev.moves && timeMs < prev.timeMs)) {
    m.set(name, { name, moves, timeMs });
  }
  const p = realPlayers.get(name);
  if (p) p.status = 'done';
}

// ---- deterministic bots ----
const ADJ = [
  'Plum', 'Wacky', 'Super', 'Lucky', 'Lively', 'Dazzling', 'Unique', 'Quantum',
  'Noble', 'Mellow', 'Brave', 'Cosmic', 'Sunny', 'Witty', 'Zesty', 'Jolly',
];
const NOUN = [
  'Meerkat', 'Tiger', 'Ninja', 'Rogue', 'Rider', 'Builder', 'Guru', 'Comet',
  'Scout', 'Falcon', 'Otter', 'Maple', 'Panda', 'Sparrow', 'Yak', 'Lynx',
];

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

interface Bot {
  name: string;
  moves: number;
  timeMs: number;
  finishAt: number; // ms offset into the round when they "finish"
}

function botsForRound(roundId: number, minMoves: number): Bot[] {
  if (!BOTS_ENABLED) return [];
  const rng = mulberry32((roundId ^ 0x9e3779b9) >>> 0);
  const count = 5 + Math.floor(rng() * 6); // 5–10
  const used = new Set<string>();
  const bots: Bot[] = [];
  for (let i = 0; i < count; i++) {
    let name = '';
    for (let tries = 0; tries < 5; tries++) {
      name =
        ADJ[Math.floor(rng() * ADJ.length)] +
        NOUN[Math.floor(rng() * NOUN.length)] +
        (100 + Math.floor(rng() * 900));
      if (!used.has(name)) break;
    }
    used.add(name);
    const moves = minMoves + (rng() < 0.45 ? 0 : rng() < 0.7 ? 1 : 2);
    const timeMs = Math.floor((8 + rng() * 130) * 1000); // 8s–138s
    const finishAt = Math.floor(rng() * ROUND_MS * 0.92);
    bots.push({ name, moves, timeMs, finishAt });
  }
  return bots;
}

export interface RoundState {
  online: LivePlayer[];
  results: RoundResult[];
  onlineCount: number;
}

export function roundState(roundId: number, minMoves: number, startsAt: number): RoundState {
  const now = Date.now();
  const elapsed = Math.max(0, now - startsAt);

  // prune stale real players
  for (const [k, p] of realPlayers) {
    if (now - p.lastSeen > ONLINE_TTL) realPlayers.delete(k);
  }

  const bots = botsForRound(roundId, minMoves);

  // results: real completes for this round + bots that have "finished"
  const resultMap = new Map<string, RoundResult>();
  for (const b of bots) {
    if (b.finishAt <= elapsed) resultMap.set(b.name, { name: b.name, moves: b.moves, timeMs: b.timeMs, bot: true });
  }
  const real = realResults.get(roundId);
  if (real) for (const r of real.values()) resultMap.set(r.name, r);

  const results = [...resultMap.values()]
    .sort((a, b) => a.moves - b.moves || a.timeMs - b.timeMs)
    .slice(0, 15);

  // online: bots still "playing" + real players active in this round (not done)
  const finished = new Set(results.map((r) => r.name));
  const online: LivePlayer[] = [];
  for (const b of bots) {
    if (b.finishAt > elapsed) online.push({ name: b.name, status: 'playing', bot: true });
  }
  for (const p of realPlayers.values()) {
    if (p.roundId !== roundId) continue;
    if (p.status === 'done' && finished.has(p.name)) continue;
    online.push({ name: p.name, status: p.status });
  }
  // de-dupe by name (real wins over bot)
  const seen = new Set<string>();
  const dedupOnline = online.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)));

  return { online: dedupOnline, results, onlineCount: dedupOnline.length };
}
