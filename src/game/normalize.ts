import type { Track } from './types';

/**
 * Título "base" de una canción, para detectar versiones de la misma:
 * "Song - 2011 Remaster", "Song (Live)", "Song [feat. X]", "Song - Acoustic" → "song".
 */
export function normalizeTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // acentos
    .replace(/\s+-\s+.*$/, '') // todo lo que va después de " - "
    .replace(/\s*[([].*?[)\]]/g, '') // (…) y […]
    .replace(/\s(feat|ft)\.?\s.*$/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base || title.toLowerCase().trim();
}

/** Misma canción = mismo título base + mismo artista principal. */
export function songKey(track: Track): string {
  return `${normalizeTitle(track.name)}|${track.artists[0]?.id ?? ''}`;
}

/** Saca duplicados (mismo ISRC o misma canción en otra versión), conservando el primero. */
export function dedupeTracks(tracks: readonly Track[]): Track[] {
  const keys = new Set<string>();
  const isrcs = new Set<string>();
  return tracks.filter((t) => {
    const key = songKey(t);
    if (keys.has(key) || (t.isrc && isrcs.has(t.isrc))) return false;
    keys.add(key);
    if (t.isrc) isrcs.add(t.isrc);
    return true;
  });
}
