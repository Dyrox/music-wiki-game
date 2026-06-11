/**
 * Persistent adjacency store (SQLite via node:sqlite). The collaboration graph
 * is essentially static, but the in-RAM caches forget it on every restart and
 * evict under pressure — so each path search re-pays seconds of upstream
 * crawling for edges we already saw. Every neighbor list we ever fetch is
 * written through here; path searches read it back in microseconds.
 *
 * Two row kinds per artist:
 *  - 'lite': collaborators from the top hot-songs page (what liteNeighbors sees)
 *  - 'full': collaborators from the full capped discography (what getArtist sees)
 * 'full' is a superset of 'lite' in practice; readers say which they want.
 *
 * All operations are best-effort: a broken/locked DB must never take gameplay
 * down, so errors degrade to "no store" (callers fall back to the network).
 */
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { GRAPH_DB_PATH } from './config.js';
import type { ArtistRef } from './types.js';

export type NeighborKind = 'lite' | 'full';

export interface StoredNeighbors {
  refs: ArtistRef[];
  fetchedAt: number;
}

let db: DatabaseSync | null = null;
let getStmt: StatementSync | null = null;
let putStmt: StatementSync | null = null;

try {
  mkdirSync(path.dirname(GRAPH_DB_PATH), { recursive: true });
  db = new DatabaseSync(GRAPH_DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS neighbors (
      artist_id  INTEGER NOT NULL,
      kind       TEXT    NOT NULL,
      refs       TEXT    NOT NULL,
      fetched_at INTEGER NOT NULL,
      PRIMARY KEY (artist_id, kind)
    )
  `);
  getStmt = db.prepare(
    'SELECT refs, fetched_at FROM neighbors WHERE artist_id = ? AND kind = ?',
  );
  putStmt = db.prepare(
    `INSERT INTO neighbors (artist_id, kind, refs, fetched_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (artist_id, kind)
     DO UPDATE SET refs = excluded.refs, fetched_at = excluded.fetched_at`,
  );
} catch (e) {
  console.error('[store] sqlite unavailable, graph store disabled:', (e as Error)?.message ?? e);
  db = null;
}

export function loadNeighbors(id: number, kind: NeighborKind): StoredNeighbors | null {
  if (!getStmt) return null;
  try {
    const row = getStmt.get(id, kind) as { refs: string; fetched_at: number } | undefined;
    if (!row) return null;
    const refs = JSON.parse(row.refs);
    if (!Array.isArray(refs)) return null;
    return { refs, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

export function saveNeighbors(id: number, kind: NeighborKind, refs: ArtistRef[]): void {
  if (!putStmt) return;
  try {
    putStmt.run(id, kind, JSON.stringify(refs), Date.now());
  } catch {
    /* best-effort */
  }
}
