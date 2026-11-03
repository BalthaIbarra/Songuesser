import {
  LIKED_SONGS_ID,
  loadArtistTracks,
  loadGenreTracks,
  loadLikedTracks,
  loadPlaylistTracks,
  type Progress,
} from '../spotify/library';
import { GENRES } from './genres';
import { dedupeTracks } from './normalize';
import { OPTION_COUNT } from './options';
import type { GameSource, Track } from './types';

export interface Pool {
  tracks: Track[];
  /** Aclaración para mostrar en la partida (por ejemplo, qué plan usó el modo género). */
  note: string | null;
}

/** Trae y limpia las canciones disponibles para la fuente elegida. */
export async function loadPool(source: GameSource, onProgress?: Progress): Promise<Pool> {
  let tracks: Track[];
  let note: string | null = null;

  if (source.mode === 'playlist') {
    tracks =
      source.id === LIKED_SONGS_ID
        ? await loadLikedTracks(onProgress)
        : await loadPlaylistTracks(source.id, onProgress);
  } else if (source.mode === 'artist') {
    tracks = await loadArtistTracks(source.id, onProgress);
  } else {
    const genre = GENRES.find((g) => g.id === source.id);
    if (!genre) throw new Error('Género desconocido');
    const res = await loadGenreTracks(genre, onProgress);
    tracks = res.tracks;
    if (res.method === 'artists') note = 'Canciones de artistas típicos del género';
  }

  const unique = dedupeTracks(tracks);
  if (unique.length < OPTION_COUNT) {
    throw new Error(
      `Hacen falta al menos ${OPTION_COUNT} canciones distintas para jugar (encontré ${unique.length}).`,
    );
  }
  return { tracks: unique, note };
}
