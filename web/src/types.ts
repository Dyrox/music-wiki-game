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
