import { shuffle } from '../utils/random';
import { randomStartMs } from './fragment';
import { songKey } from './normalize';
import type { GameMode, Round, Track } from './types';

export const OPTION_COUNT = 4;

/**
 * Elige las opciones incorrectas según el modo y devuelve las 4 mezcladas.
 * - playlist: primero canciones del mismo artista que la correcta, después el resto de la playlist.
 * - artist / genre: el pool ya es de ese artista / género, así que se elige al azar.
 * Nunca repite una canción ni otra versión de la misma.
 */
export function buildOptions(correct: Track, pool: readonly Track[], mode: GameMode): Track[] {
  const usedKeys = new Set([songKey(correct)]);
  const wrong: Track[] = [];
  const tryAdd = (t: Track) => {
    if (wrong.length >= OPTION_COUNT - 1) return;
    const key = songKey(t);
    if (t.id === correct.id || usedKeys.has(key)) return;
    usedKeys.add(key);
    wrong.push(t);
  };

  const candidates = shuffle(pool);
  if (mode === 'playlist') {
    const mainArtist = correct.artists[0]?.id;
    const artistIds = new Set(correct.artists.map((a) => a.id));
    candidates.filter((t) => t.artists[0]?.id === mainArtist).forEach(tryAdd);
    candidates.filter((t) => t.artists.some((a) => artistIds.has(a.id))).forEach(tryAdd);
  }
  candidates.forEach(tryAdd);

  return shuffle([correct, ...wrong]);
}

/** Arma todas las rondas: canciones distintas como respuesta, cada una con sus opciones. */
export function buildRounds(
  pool: readonly Track[],
  mode: GameMode,
  roundsCount: number,
  fragmentMs: number,
): Round[] {
  return shuffle(pool)
    .slice(0, roundsCount)
    .map((track) => ({
      track,
      options: buildOptions(track, pool, mode),
      startMs: randomStartMs(track.durationMs, fragmentMs),
    }));
}
