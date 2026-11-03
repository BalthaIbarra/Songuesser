import { getAccessToken } from './auth';

const BASE = 'https://api.spotify.com/v1';

export class SpotifyApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch a la Web API con token, reintento ante 401 (token vencido) y 429 (rate limit). */
export async function spotifyFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let forceRefresh = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await getAccessToken(forceRefresh);
    const res = await fetch(path.startsWith('http') ? path : BASE + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    if (res.status === 401 && !forceRefresh) {
      forceRefresh = true;
      continue;
    }
    if (res.status === 429) {
      const body = await res.clone().json().catch(() => ({}));
      if (body.reason === 'QUOTA_EXCEEDED') {
        throw new SpotifyApiError(429, 'Se agotó la cuota de la API de Spotify por hoy');
      }
      await sleep(Number(res.headers.get('Retry-After') ?? 1) * 1000);
      continue;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new SpotifyApiError(res.status, body.error?.message ?? `Error ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  throw new SpotifyApiError(0, 'Spotify no respondió, probá de nuevo');
}
