/** Segundo de inicio al azar, dejando lugar para el fragmento completo antes del final. */
export function randomStartMs(durationMs: number, lengthMs: number): number {
  // Evitamos los primeros 5 s (silencios/intros) y los últimos 3 s cuando la canción lo permite.
  const min = durationMs > lengthMs + 15_000 ? 5_000 : 0;
  const max = Math.max(min, durationMs - lengthMs - 3_000);
  return Math.floor(min + Math.random() * (max - min));
}
