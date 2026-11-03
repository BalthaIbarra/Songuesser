import type { DifficultyConfig } from './difficulty';

const BASE_POINTS = 300;
const SPEED_POINTS = 700;
/** A partir de este tiempo de respuesta ya no hay bonus por velocidad. */
const SPEED_WINDOW_MS = 20_000;

/**
 * Puntos de una respuesta: 0 si es incorrecta; si es correcta, una base más un bonus
 * que baja linealmente con el tiempo, todo multiplicado por la dificultad.
 */
export function pointsFor(correct: boolean, elapsedMs: number, difficulty: DifficultyConfig): number {
  if (!correct) return 0;
  const speed = Math.max(0, 1 - elapsedMs / SPEED_WINDOW_MS);
  return Math.round((BASE_POINTS + SPEED_POINTS * speed) * difficulty.multiplier);
}

/** Racha actual (aciertos seguidos al final) y mejor racha de la partida. */
export function streaks(hits: readonly boolean[]): { current: number; best: number } {
  let current = 0;
  let best = 0;
  for (const hit of hits) {
    current = hit ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}
