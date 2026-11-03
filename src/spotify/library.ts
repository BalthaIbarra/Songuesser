import type { Track } from '../game/types';
import { spotifyFetch } from './api';

// Forma de un track tal como lo devuelve la Web API (solo los campos que usamos).
export interface ApiTrack {
  id: string | null;
  uri: string;
  name: string;
  is_local?: boolean;
  is_playable?: boolean;
  duration_ms: number;
  artists: { id: string; name: string }[];
  album: { name: string; images: { url: string; width: number | null }[] };
  external_ids?: { isrc?: string };
}

interface Page<T> {
  items: T[];
  total: number;
  next: string | null;
}

export interface Me {
  id: string;
  display_name: string | null;
  images?: { url: string }[];
}

export function toTrack(t: ApiTrack): Track | null {
  if (!t.id || t.is_local || t.is_playable === false) return null;
  // La imagen más grande viene primero.
  const image = t.album.images[0]?.url ?? null;
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
    album: { name: t.album.name, imageUrl: image },
    durationMs: t.duration_ms,
    isrc: t.external_ids?.isrc ?? null,
  };
}

export function getMe(): Promise<Me> {
  return spotifyFetch<Me>('/me');
}

/** Una canción al azar de "Canciones que te gustan" (dos pedidos: total y offset al azar). */
export async function getRandomLikedTrack(): Promise<Track> {
  const first = await spotifyFetch<Page<{ track: ApiTrack }>>('/me/tracks?limit=1');
  if (first.total === 0) throw new Error('No tenés canciones en "Canciones que te gustan"');

  for (let attempt = 0; attempt < 5; attempt++) {
    const offset = Math.floor(Math.random() * first.total);
    const page = await spotifyFetch<Page<{ track: ApiTrack }>>(
      `/me/tracks?limit=1&offset=${offset}&market=from_token`,
    );
    const track = page.items[0] && toTrack(page.items[0].track);
    if (track) return track;
  }
  throw new Error('No encontré una canción reproducible, probá de nuevo');
}
