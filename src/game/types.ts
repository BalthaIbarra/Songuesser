export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { name: string; imageUrl: string | null };
  durationMs: number;
  isrc: string | null;
}

export type GameMode = 'playlist' | 'artist' | 'genre';

/** Qué se eligió para jugar: una playlist, un artista o un género. */
export interface GameSource {
  mode: GameMode;
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface Round {
  track: Track;
  options: Track[]; // 4 opciones mezcladas, incluye la correcta
  startMs: number;
}
