/**
 * Lightweight, in-memory "who's playing right now" + per-room results, in the
 * spirit of The Wiki Game's lobby. A "room" is a start→target pair (see
 * `roomKey`): everyone attempting the same pair — whether from the timed round
 * or from custom/free mode — competes on the same board. Real visitors are
 * tracked via heartbeats; deterministic bots per room can keep the board lively
 * (opt-in via env BOTS=on). Everything resets on server restart — no DB.
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
  room: string;
  status: PlayerStatus;
  lastSeen: number;
}

const ONLINE_TTL = 6_000; // fallback for crashes; tab-close uses an explicit leave
// Real players only by default. Set BOTS=on to add filler bots for demos.
const BOTS_ENABLED = (process.env.BOTS ?? 'off') === 'on';

// Keyed by a stable per-browser clientId (NOT the display name) so renaming
// updates the same player instead of creating a duplicate.
const realPlayers = new Map<string, RealPlayer>(); // key: clientId
const realResults = new Map<string, Map<string, RoundResult>>(); // room -> clientId -> result

/**
 * Competition room key. The same start→target pair shares one room, so custom
 * mode and the timed round merge when they happen to pick the same pair.
 * Direction matters (A→B is a different challenge than B→A).
 */
export function roomKey(startId: number, targetId: number): string {
  return `${startId}-${targetId}`;
}

export function heartbeat(
  clientId: string,
  name: string,
  room: string,
  status: PlayerStatus,
): void {
  if (!clientId || !room) return;
  realPlayers.set(clientId, {
    clientId,
    name: name || clientId,
    room,
    status,
    lastSeen: Date.now(),
  });
}

/** Remove a player immediately (sent on tab close via sendBeacon). */
export function leave(clientId: string): void {
  if (clientId) realPlayers.delete(clientId);
}

export function complete(
  clientId: string,
  name: string,
  room: string,
  moves: number,
  timeMs: number,
): void {
  if (!clientId || !room) return;
  let m = realResults.get(room);
  if (!m) {
    m = new Map();
    realResults.set(room, m);
  }
  const prev = m.get(clientId);
  // keep the best attempt (fewer moves, then faster)
  if (!prev || moves < prev.moves || (moves === prev.moves && timeMs < prev.timeMs)) {
    m.set(clientId, { name: name || clientId, moves, timeMs });
  }
  const p = realPlayers.get(clientId);
  if (p && p.room === room) p.status = 'done';
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

interface Bot {
  name: string;
  moves: number;
  timeMs: number;
  done: boolean;
}

function botsForRoom(room: string, minMoves: number): Bot[] {
  if (!BOTS_ENABLED) return [];
  const rng = mulberry32(hashStr('room:' + room));
  const count = 5 + Math.floor(rng() * 6); // 5–10
  const base = minMoves > 0 ? minMoves : 3;
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
    const moves = base + (rng() < 0.45 ? 0 : rng() < 0.7 ? 1 : 2);
    const timeMs = Math.floor((8 + rng() * 130) * 1000); // 8s–138s
    bots.push({ name, moves, timeMs, done: rng() < 0.7 });
  }
  return bots;
}

export interface RoomState {
  online: LivePlayer[];
  results: RoundResult[];
  onlineCount: number;
}

export function roomState(room: string, minMoves = 0): RoomState {
  const now = Date.now();

  // prune stale real players
  for (const [k, p] of realPlayers) {
    if (now - p.lastSeen > ONLINE_TTL) realPlayers.delete(k);
  }

  const bots = botsForRoom(room, minMoves);
  const real = realResults.get(room);

  // results: real completes (keyed by clientId) + bots that have "finished"
  const resultMap = new Map<string, RoundResult>();
  for (const b of bots) {
    if (b.done)
      resultMap.set('bot:' + b.name, { name: b.name, moves: b.moves, timeMs: b.timeMs, bot: true });
  }
  if (real) for (const [cid, r] of real) resultMap.set(cid, r);

  const results = [...resultMap.values()]
    .sort((a, b) => a.moves - b.moves || a.timeMs - b.timeMs)
    .slice(0, 15);

  // online: bots still "playing" + real players active in this room (not done),
  // de-duped by clientId (so renaming never doubles you up)
  const online: LivePlayer[] = [];
  const seen = new Set<string>();
  for (const b of bots) {
    const key = 'bot:' + b.name;
    if (!b.done && !seen.has(key)) {
      seen.add(key);
      online.push({ name: b.name, status: 'playing', bot: true });
    }
  }
  for (const p of realPlayers.values()) {
    if (p.room !== room || seen.has(p.clientId)) continue;
    if (p.status === 'done' && real?.has(p.clientId)) continue; // already in results
    seen.add(p.clientId);
    online.push({ name: p.name, status: p.status });
  }

  return { online, results, onlineCount: online.length };
}
