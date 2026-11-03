import type { Difficulty } from './difficulty';
import type { GameSource } from './types';

const PREFIX = 'record:';

export interface GameRecord {
  score: number;
  hits: number;
  rounds: number;
  bestStreak: number;
  date: string; // ISO
}

/**
 * Un récord por playlist/artista/género. Se separa también por dificultad y cantidad
 * de rondas, porque 20 rondas en difícil no se pueden comparar con 5 en fácil.
 */
export function recordKey(source: GameSource, difficulty: Difficulty, rounds: number): string {
  return `${PREFIX}${source.mode}:${source.id}:${difficulty}:${rounds}`;
}

export function getRecord(key: string): GameRecord | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as GameRecord) : null;
  } catch {
    return null;
  }
}

export function isNewRecord(score: number, previous: GameRecord | null): boolean {
  return score > 0 && (!previous || score > previous.score);
}

export function saveRecord(key: string, record: GameRecord): void {
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Sin almacenamiento disponible (modo privado): el juego sigue igual.
  }
}
