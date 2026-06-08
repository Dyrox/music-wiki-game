import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT, WEB_DIST_DIR } from './config.js';
import { getArtist, getArtistWithTarget, getAlbums, getMvs, getDesc } from './artist.js';
import { searchArtists } from './search.js';
import { findPath, shortestDistance } from './game.js';
import { dailyChallenge, randomChallenge } from './challenge.js';
import { currentRound, ensureRounds } from './rounds.js';
import { heartbeat, complete, leave, roundState } from './presence.js';

const defaultWebDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../web/dist',
);
const webDist = WEB_DIST_DIR ?? defaultWebDist;
const webIndex = path.join(webDist, 'index.html');

const app = express();
app.use(cors());
app.use(express.json());

function asyncRoute(
  fn: (req: express.Request, res: express.Response) => Promise<void>,
): express.RequestHandler {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error(`[error] ${req.method} ${req.url}:`, err?.message ?? err);
      res.status(502).json({ error: String(err?.message ?? err) });
    });
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get(
  '/api/search',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q ?? '');
    res.json(await searchArtists(q));
  }),
);

app.get(
  '/api/artist/:id',
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'bad id' });
      return;
    }
    const target = Number(req.query.target);
    res.json(
      Number.isFinite(target) && target > 0
        ? await getArtistWithTarget(id, target)
        : await getArtist(id),
    );
  }),
);

app.get(
  '/api/artist/:id/albums',
  asyncRoute(async (req, res) => {
    res.json(await getAlbums(Number(req.params.id)));
  }),
);

app.get(
  '/api/artist/:id/mvs',
  asyncRoute(async (req, res) => {
    res.json(await getMvs(Number(req.params.id)));
  }),
);

app.get(
  '/api/artist/:id/desc',
  asyncRoute(async (req, res) => {
    res.json(await getDesc(Number(req.params.id)));
  }),
);

// shortest known path — used for hints / "give up"
app.get(
  '/api/path',
  asyncRoute(async (req, res) => {
    const from = Number(req.query.from);
    const to = Number(req.query.to);
    const maxDepth = req.query.maxDepth ? Number(req.query.maxDepth) : undefined;
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      res.status(400).json({ error: 'bad from/to' });
      return;
    }
    res.json((await findPath(from, to, maxDepth)) ?? { path: null, moves: null });
  }),
);

// exact shortest distance over the full collaboration graph (debug / QA)
app.get(
  '/api/distance',
  asyncRoute(async (req, res) => {
    const from = Number(req.query.from);
    const to = Number(req.query.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      res.status(400).json({ error: 'bad from/to' });
      return;
    }
    res.json({ from, to, distance: await shortestDistance(from, to, 6) });
  }),
);

app.get(
  '/api/challenge/daily',
  asyncRoute(async (req, res) => {
    const date = req.query.date ? String(req.query.date) : undefined;
    res.json(await dailyChallenge(date));
  }),
);

app.get(
  '/api/challenge/random',
  asyncRoute(async (_req, res) => {
    res.json(await randomChallenge());
  }),
);

// Global timed round (The-Wiki-Game style): same puzzle for everyone, rotates
// every ROUND_MS. Returns the current pairing + timing for the countdown.
app.get(
  '/api/round/current',
  asyncRoute(async (_req, res) => {
    res.json(await currentRound());
  }),
);

// Lobby state: the current round + who's playing right now + round results.
app.get(
  '/api/round/state',
  asyncRoute(async (_req, res) => {
    const round = await currentRound();
    const state = roundState(round.roundId, round.minMoves, round.startsAt);
    res.json({ round, ...state });
  }),
);

app.post('/api/round/heartbeat', (req, res) => {
  const { clientId, name, roundId, status } = req.body ?? {};
  if (typeof clientId === 'string' && Number.isFinite(roundId)) {
    heartbeat(
      clientId,
      typeof name === 'string' ? name : '',
      Number(roundId),
      status === 'playing' ? 'playing' : 'browsing',
    );
  }
  res.json({ ok: true });
});

app.post('/api/round/leave', (req, res) => {
  const { clientId } = req.body ?? {};
  if (typeof clientId === 'string') leave(clientId);
  res.json({ ok: true });
});

app.post('/api/round/complete', (req, res) => {
  const { clientId, name, roundId, moves, timeMs } = req.body ?? {};
  if (typeof clientId === 'string' && Number.isFinite(roundId) && Number.isFinite(moves)) {
    complete(
      clientId,
      typeof name === 'string' ? name : '',
      Number(roundId),
      Number(moves),
      Number(timeMs) || 0,
    );
  }
  res.json({ ok: true });
});

if (existsSync(webIndex)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(webIndex);
  });
}

app.listen(PORT, () => {
  console.log(`music-wiki-game server listening on http://localhost:${PORT}`);
  // Keep the current + upcoming global rounds generated ahead of time so
  // /api/round/current is always instant and rotates smoothly.
  ensureRounds()
    .then(() => currentRound())
    .then((r) => console.log(`[round] #${r.roundId}: ${r.start.name} -> ${r.target.name} (${r.minMoves} moves)`))
    .catch((e) => console.error('[round] prewarm failed:', e?.message ?? e));
  setInterval(() => void ensureRounds(), 15_000);
});
