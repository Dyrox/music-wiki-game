export interface ArtistRef {
  id: number;
  name: string;
}

export interface Song {
  id: number;
  name: string;
  /** translated / alternate titles, e.g. ["所以我放弃了音乐"] */
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
  /** songs that connect the current artist to this neighbor */
  viaSongs: { id: number; name: string; picUrl: string }[];
}

export interface ArtistHeader {
  id: number;
  name: string;
  alias: string[];
  trans: string;
  picUrl: string;
  briefDesc: string;
  musicSize: number;
  albumSize: number;
  mvSize: number;
}

export interface ArtistData extends ArtistHeader {
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
