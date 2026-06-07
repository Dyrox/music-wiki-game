import { useEffect, useReducer } from 'react';

// A per-browser handle for the lobby (no accounts). Editable by the user and
// persisted in localStorage; components subscribe via useUsername() so a rename
// re-renders the leaderboard / heartbeats everywhere.
const ADJ = [
  'Plum', 'Wacky', 'Super', 'Lucky', 'Lively', 'Dazzling', 'Unique', 'Quantum',
  'Noble', 'Mellow', 'Brave', 'Cosmic', 'Sunny', 'Witty', 'Zesty', 'Jolly',
];
const NOUN = [
  'Meerkat', 'Tiger', 'Ninja', 'Rogue', 'Rider', 'Builder', 'Guru', 'Comet',
  'Scout', 'Falcon', 'Otter', 'Maple', 'Panda', 'Sparrow', 'Yak', 'Lynx',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const KEY = 'mwg_username';

function readInitial(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  const name = `${pick(ADJ)}${pick(NOUN)}${100 + Math.floor(Math.random() * 900)}`;
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* ignore */
  }
  return name;
}

let current = readInitial();
const listeners = new Set<() => void>();

// A stable per-browser id (separate from the display name) so renaming doesn't
// spawn a "ghost" player — presence is keyed by this, the name is just display.
let clientId: string | null = null;
export function getClientId(): string {
  if (clientId) return clientId;
  try {
    let id = localStorage.getItem('mwg_clientId');
    if (!id) {
      id =
        (globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem('mwg_clientId', id);
    }
    return (clientId = id);
  } catch {
    return (clientId = 'anon-' + Math.random().toString(36).slice(2));
  }
}

export function getUsername(): string {
  return current;
}

export const MAX_NAME_LEN = 16;

/** Trim, collapse spaces, cap length. Returns '' if nothing usable. */
export function sanitizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LEN);
}

export function setUsername(raw: string): boolean {
  const name = sanitizeName(raw);
  if (!name || name === current) return false;
  current = name;
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  return true;
}

/** Subscribe a component to the current username. */
export function useUsername(): string {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return current;
}
