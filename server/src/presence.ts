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
  clientId: string;
  name: string;
  roundId: number;
  status: PlayerStatus;
  lastSeen: number;
}

const ONLINE_TTL = 8_000;
// Real players only by default. Set BOTS=on to add filler bots for demos.
const BOTS_ENABLED = (process.env.BOTS ?? 'off') === 'on';

// Keyed by a stable per-browser clientId (NOT the display name) so renaming
// updates the same player instead of creating a duplicate.
const realPlayers = new Map<string, RealPlayer>(); // key: clientId
const realResults = new Map<number, Map<string, RoundResult>>(); // roundId -> clientId -> result

export function heartbeat(
  clientId: string,
  name: string,
  roundId: number,
  status: PlayerStatus,
): void {
  if (!clientId) return;
  realPlayers.set(clientId, { clientId, name: name || clientId, roundId, status, lastSeen: Date.now() });
}

export function complete(
  clientId: string,
  name: string,
  roundId: number,
  moves: number,
  timeMs: number,
): void {
  if (!clientId) return;
  let m = realResults.get(roundId);
  if (!m) {
    m = new Map();
    realResults.set(roundId, m);
  }
  const prev = m.get(clientId);
  // keep the best attempt (fewer moves, then faster)
  if (!prev || moves < prev.moves || (moves === prev.moves && timeMs < prev.timeMs)) {
    m.set(clientId, { name: name || clientId, moves, timeMs });
  }
  const p = realPlayers.get(clientId);
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

  const real = realResults.get(roundId);

  // results: real completes (keyed by clientId) + bots that have "finished"
  const resultMap = new Map<string, RoundResult>();
  for (const b of bots) {
    if (b.finishAt <= elapsed)
      resultMap.set('bot:' + b.name, { name: b.name, moves: b.moves, timeMs: b.timeMs, bot: true });
  }
  if (real) for (const [cid, r] of real) resultMap.set(cid, r);

  const results = [...resultMap.values()]
    .sort((a, b) => a.moves - b.moves || a.timeMs - b.timeMs)
    .slice(0, 15);

  // online: bots still "playing" + real players active in this round (not done),
  // de-duped by clientId (so renaming never doubles you up)
  const online: LivePlayer[] = [];
  const seen = new Set<string>();
  for (const b of bots) {
    const key = 'bot:' + b.name;
    if (b.finishAt > elapsed && !seen.has(key)) {
      seen.add(key);
      online.push({ name: b.name, status: 'playing', bot: true });
    }
  }
  for (const p of realPlayers.values()) {
    if (p.roundId !== roundId || seen.has(p.clientId)) continue;
    if (p.status === 'done' && real?.has(p.clientId)) continue; // already in results
    seen.add(p.clientId);
    online.push({ name: p.name, status: p.status });
  }

  return { online, results, onlineCount: online.length };
}
