import type { Genre } from '../game/genres';
import { normalizeTitle } from '../game/normalize';
import type { Track } from '../game/types';
import { mapLimit } from '../utils/async';
import { shuffle } from '../utils/random';
import { spotifyFetch } from './api';

// Formas de la Web API (solo los campos que usamos).
interface ApiImage {
  url: string;
}

interface ApiAlbumRef {
  name: string;
  images?: ApiImage[] | null;
}

interface ApiTrack {
  id: string | null;
  uri: string;
  name: string;
  type?: string;
  is_local?: boolean;
  is_playable?: boolean;
  duration_ms: number;
  artists: { id: string; name: string }[];
  album?: ApiAlbumRef;
  external_ids?: { isrc?: string };
}

interface Page<T> {
  items: T[];
  total: number;
}

interface ApiPlaylist {
  id: string;
  name: string;
  images: ApiImage[] | null;
  owner: { id: string; display_name?: string | null };
  collaborative: boolean;
  // Desde feb 2026 el campo se llama `items`; `tracks` queda por compatibilidad.
  items?: { total: number };
  tracks?: { total: number };
}

interface ApiArtist {
  id: string;
  name: string;
  images: ApiImage[];
}

interface ApiAlbum extends ApiAlbumRef {
  id: string;
  tracks?: Page<ApiTrack>;
}

export interface Me {
  id: string;
  display_name: string | null;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  total: number | null;
  owner: string;
  /** En modo desarrollo solo se pueden leer las playlists propias o colaborativas. */
  readable: boolean;
}

export interface ArtistSummary {
  id: string;
  name: string;
  imageUrl: string | null;
}

export type Progress = (done: number, total: number) => void;

export const LIKED_SONGS_ID = 'liked';

function toTrack(t: ApiTrack | null | undefined, album?: ApiAlbumRef): Track | null {
  if (!t || typeof t !== 'object' || !t.id || t.is_local || t.is_playable === false) return null;
  if (t.type && t.type !== 'track') return null; // episodios de podcast
  const albumRef = t.album ?? album;
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
    album: { name: albumRef?.name ?? '', imageUrl: albumRef?.images?.[0]?.url ?? null },
    durationMs: t.duration_ms,
    isrc: t.external_ids?.isrc ?? null,
  };
}

const isTrack = (t: Track | null): t is Track => t !== null;

/** Trae una lista paginada. Si tiene más de `maxPages` páginas, toma páginas al azar. */
async function fetchPaged<T>(
  path: string,
  limit: number,
  maxPages: number,
  onProgress?: Progress,
): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  const url = (offset: number) => `${path}${sep}limit=${limit}&offset=${offset}`;

  const first = await spotifyFetch<Page<T>>(url(0));
  const pageCount = Math.ceil(first.total / limit);
  let offsets = Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (i + 1) * limit);
  if (offsets.length > maxPages - 1) offsets = shuffle(offsets).slice(0, maxPages - 1);

  const totalPages = offsets.length + 1;
  let done = 1;
  onProgress?.(done, totalPages);
  const rest = await mapLimit(offsets, 4, async (offset) => {
    const page = await spotifyFetch<Page<T>>(url(offset));
    onProgress?.(++done, totalPages);
    return page.items;
  });
  return first.items.concat(...rest);
}

export function getMe(): Promise<Me> {
  return spotifyFetch<Me>('/me');
}

// ---------- Playlists y "Canciones que te gustan" ----------

export async function getMyPlaylists(meId: string): Promise<PlaylistSummary[]> {
  const list = await fetchPaged<ApiPlaylist | null>('/me/playlists', 50, 10);
  return list
    .filter((p): p is ApiPlaylist => p !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.images?.[0]?.url ?? null,
      total: p.items?.total ?? p.tracks?.total ?? null,
      owner: p.owner.display_name ?? p.owner.id,
      readable: p.owner.id === meId || p.collaborative,
    }));
}

export async function getLikedCount(): Promise<number> {
  const page = await spotifyFetch<Page<unknown>>('/me/tracks?limit=1');
  return page.total;
}

export async function loadLikedTracks(onProgress?: Progress): Promise<Track[]> {
  const items = await fetchPaged<{ track: ApiTrack }>('/me/tracks?market=from_token', 50, 20, onProgress);
  return items.map((i) => toTrack(i.track)).filter(isTrack);
}

export async function loadPlaylistTracks(playlistId: string, onProgress?: Progress): Promise<Track[]> {
  // Desde feb 2026 el endpoint es /items y cada entrada trae `item` (antes `track`).
  type Entry = { item?: ApiTrack | null; track?: ApiTrack | null };
  const entries = await fetchPaged<Entry>(
    `/playlists/${playlistId}/items?market=from_token`,
    50,
    20,
    onProgress,
  );
  return entries.map((e) => toTrack(e.item ?? e.track)).filter(isTrack);
}

// ---------- Artistas ----------

export async function searchArtists(query: string): Promise<ArtistSummary[]> {
  const res = await spotifyFetch<{ artists: Page<ApiArtist> }>(
    `/search?type=artist&limit=10&q=${encodeURIComponent(query)}`,
  );
  return res.artists.items.map((a) => ({
    id: a.id,
    name: a.name,
    imageUrl: a.images[0]?.url ?? null,
  }));
}

/**
 * Canciones de un artista. El endpoint de "top tracks" ya no existe en modo desarrollo,
 * así que recorremos sus álbumes y singles (un pedido por álbum: no hay pedidos en lote).
 */
export async function loadArtistTracks(artistId: string, onProgress?: Progress): Promise<Track[]> {
  const albums = await fetchPaged<ApiAlbum>(
    `/artists/${artistId}/albums?include_groups=album,single&market=from_token`,
    10,
    3,
  );

  // Las ediciones "Deluxe" / "Remastered" del mismo disco no aportan canciones nuevas.
  const seen = new Set<string>();
  const unique = albums.filter((a) => {
    const key = normalizeTitle(a.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let done = 0;
  const lists = await mapLimit(unique, 4, async (a) => {
    const album = await spotifyFetch<ApiAlbum>(`/albums/${a.id}?market=from_token`);
    onProgress?.(++done, unique.length);
    return (album.tracks?.items ?? [])
      .filter((t) => t.artists.some((x) => x.id === artistId))
      .map((t) => toTrack(t, album))
      .filter(isTrack);
  });
  return lists.flat();
}

// ---------- Géneros ----------

async function searchTracks(query: string, offset: number): Promise<Page<ApiTrack>> {
  const res = await spotifyFetch<{ tracks: Page<ApiTrack> }>(
    `/search?type=track&limit=10&offset=${offset}&market=from_token&q=${encodeURIComponent(query)}`,
  );
  return res.tracks;
}

const sameName = (a: string, b: string) => normalizeTitle(a) === normalizeTitle(b);

export interface GenreTracks {
  tracks: Track[];
  method: 'genre-filter' | 'artists';
}

/**
 * Plan A: búsqueda con el filtro `genre:"…"` en páginas al azar (la búsqueda trae 10 por pedido).
 * Plan B: si el filtro no devuelve suficiente, canciones de artistas típicos del género.
 */
export async function loadGenreTracks(genre: Genre, onProgress?: Progress): Promise<GenreTracks> {
  const query = `genre:"${genre.query}"`;
  const first = await searchTracks(query, 0).catch(() => ({ items: [], total: 0 }) as Page<ApiTrack>);

  if (first.items.length >= 10) {
    const maxOffset = Math.min(first.total, 500) - 10;
    const offsets = shuffle(
      Array.from({ length: Math.floor(maxOffset / 10) }, (_, i) => (i + 1) * 10),
    ).slice(0, 7);
    let done = 1;
    onProgress?.(done, offsets.length + 1);
    const pages = await mapLimit(offsets, 3, async (offset) => {
      const page = await searchTracks(query, offset).catch(() => ({ items: [], total: 0 }));
      onProgress?.(++done, offsets.length + 1);
      return page.items;
    });
    const tracks = first.items.concat(...pages).map((t) => toTrack(t)).filter(isTrack);
    if (tracks.length >= 20) return { tracks, method: 'genre-filter' };
  }

  let done = 0;
  const lists = await mapLimit(genre.artists, 3, async (artist) => {
    const page = await searchTracks(`artist:"${artist}"`, 0).catch(() => ({ items: [], total: 0 }));
    onProgress?.(++done, genre.artists.length);
    return page.items
      .filter((t) => t.artists[0] && sameName(t.artists[0].name, artist))
      .map((t) => toTrack(t))
      .filter(isTrack);
  });
  return { tracks: lists.flat(), method: 'artists' };
}
