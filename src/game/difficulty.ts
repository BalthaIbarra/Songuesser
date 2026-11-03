export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  fragmentMs: number;
  /** Multiplica los puntos de cada acierto: fragmentos más cortos valen más. */
  multiplier: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { id: 'easy', label: 'Fácil', fragmentMs: 15_000, multiplier: 1 },
  { id: 'medium', label: 'Medio', fragmentMs: 10_000, multiplier: 1.5 },
  { id: 'hard', label: 'Difícil', fragmentMs: 5_000, multiplier: 2 },
];

export function getDifficulty(id: Difficulty): DifficultyConfig {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}
