export interface ArtistRef {
  id: number;
  name: string;
}

export interface Song {
  id: number;
  name: string;
  alia: string[];
  album: { id: number; name: string; picUrl: string };
  artists: ArtistRef[];
  durationMs: number;
  fee: number;
  hasMv: boolean;
}

export interface Neighbor {
  artistId: number;
  name: string;
  viaSongs: { id: number; name: string; picUrl: string }[];
}

export interface ArtistData {
  id: number;
  name: string;
  alias: string[];
  trans: string;
  picUrl: string;
  briefDesc: string;
  musicSize: number;
  albumSize: number;
  mvSize: number;
  songs: Song[];
  neighbors: Neighbor[];
}

export interface Album {
  id: number;
  name: string;
  picUrl: string;
  publishTime: number;
  size: number;
}

export interface Mv {
  id: number;
  name: string;
  picUrl: string;
  durationMs: number;
  playCount: number;
}

export interface ArtistDesc {
  briefDesc: string;
  sections: { ti: string; txt: string }[];
}

export interface SearchArtist {
  id: number;
  name: string;
  picUrl: string;
  alias: string[];
  musicSize: number;
}

export interface Challenge {
  mode: 'daily' | 'random';
  date?: string;
  start: ArtistRef;
  target: ArtistRef;
  minMoves: number;
}

export interface PathResult {
  path: ArtistRef[] | null;
  moves: number | null;
}

export interface RoundTile {
  id: number;
  name: string;
  picUrl: string;
}

export interface Round {
  roundId: number;
  durationMs: number;
  startsAt: number;
  endsAt: number;
  serverNow: number;
  start: RoundTile;
  target: RoundTile;
  minMoves: number;
}

export interface LivePlayer {
  name: string;
  status: 'browsing' | 'playing' | 'done';
  bot?: boolean;
}

export interface RoundResultEntry {
  name: string;
  moves: number;
  timeMs: number;
  bot?: boolean;
}

export interface RoundState {
  round: Round;
  online: LivePlayer[];
  results: RoundResultEntry[];
  onlineCount: number;
}
