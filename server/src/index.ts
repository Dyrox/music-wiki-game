import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { getArtist } from './artist.js';
import { searchArtists } from './search.js';
import { findPath, shortestDistance } from './game.js';
import { dailyChallenge, randomChallenge } from './challenge.js';
import { currentRound, ensureRounds } from './rounds.js';

const app = express();
app.use(cors());

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
    res.json(await getArtist(id));
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

app.listen(PORT, () => {
  console.log(`music-wiki-game server listening on http://localhost:${PORT}`);
  // Keep the current + next global round generated ahead of time so
  // /api/round/current is always instant and rotates smoothly.
  ensureRounds()
    .then(() => currentRound())
    .then((r) => console.log(`[round] #${r.roundId}: ${r.start.name} -> ${r.target.name} (${r.minMoves} moves)`))
    .catch((e) => console.error('[round] prewarm failed:', e?.message ?? e));
  setInterval(() => void ensureRounds(), 15_000);
});
