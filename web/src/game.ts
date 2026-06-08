import type { ArtistRef } from './types';

export type GameMode = 'free' | 'daily' | 'random' | 'round';

export interface GameState {
  phase: 'setup' | 'playing' | 'won' | 'lost';
  mode: GameMode;
  date?: string;
  roundId?: number;
  roundEndsAt?: number;
  start: ArtistRef;
  target: ArtistRef;
  minMoves: number | null;
  /** visited artists, path[0] = start, last element = current artist */
  path: ArtistRef[];
  startTime: number;
  endTime: number | null;
  /** used a hint or saw the route → disqualified from the ranking this round */
  usedHelp: boolean;
}

export const initialState: GameState = {
  phase: 'setup',
  mode: 'free',
  start: { id: 0, name: '' },
  target: { id: 0, name: '' },
  minMoves: null,
  path: [],
  startTime: 0,
  endTime: null,
  usedHelp: false,
};

export type Action =
  | {
      type: 'begin';
      mode: GameMode;
      date?: string;
      roundId?: number;
      roundEndsAt?: number;
      start: ArtistRef;
      target: ArtistRef;
      minMoves: number | null;
    }
  | { type: 'travel'; artist: ArtistRef }
  | { type: 'jumpTo'; index: number }
  | { type: 'useHelp' }
  | { type: 'timeout' }
  | { type: 'restart' }
  | { type: 'exit' };

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'begin':
      return {
        phase: 'playing',
        mode: action.mode,
        date: action.date,
        roundId: action.roundId,
        roundEndsAt: action.roundEndsAt,
        start: action.start,
        target: action.target,
        minMoves: action.minMoves,
        path: [action.start],
        startTime: Date.now(),
        endTime: null,
        usedHelp: false,
      };

    case 'useHelp':
      return state.usedHelp ? state : { ...state, usedHelp: true };

    case 'travel': {
      if (state.phase !== 'playing') return state;
      // ignore staying on the same artist
      const current = state.path[state.path.length - 1];
      if (current.id === action.artist.id) return state;
      const path = [...state.path, action.artist];
      const won = action.artist.id === state.target.id;
      return {
        ...state,
        path,
        phase: won ? 'won' : 'playing',
        endTime: won ? Date.now() : null,
      };
    }

    case 'jumpTo': {
      // backtrack to an earlier point in the path (breadcrumb click)
      if (state.phase !== 'playing') return state;
      if (action.index < 0 || action.index >= state.path.length) return state;
      return {
        ...state,
        phase: 'playing',
        endTime: null,
        path: state.path.slice(0, action.index + 1),
      };
    }

    case 'timeout':
      if (state.phase !== 'playing' || state.mode !== 'round') return state;
      return {
        ...state,
        phase: 'lost',
        endTime: state.roundEndsAt ?? Date.now(),
      };

    case 'restart':
      return {
        ...state,
        phase: 'playing',
        path: [state.start],
        startTime: Date.now(),
        endTime: null,
      };

    case 'exit':
      return initialState;

    default:
      return state;
  }
}

export function currentArtist(state: GameState): ArtistRef {
  return state.path[state.path.length - 1];
}

export function moveCount(state: GameState): number {
  return Math.max(0, state.path.length - 1);
}
