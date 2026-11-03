// OAuth 2.0 Authorization Code + PKCE, todo en el cliente (sin backend).

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Sale del origen actual: sirve igual en http://127.0.0.1:5173 y en el dominio de Vercel.
// Cada origen tiene que estar cargado como Redirect URI en el Dashboard de Spotify.
const REDIRECT_URI = `${window.location.origin}/callback`;

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-modify-playback-state',
  'user-read-playback-state',
];

const TOKEN_KEY = 'spotify_token';
const VERIFIER_KEY = 'spotify_pkce_verifier';
const STATE_KEY = 'spotify_pkce_state';

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function readToken(): StoredToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

function saveToken(res: TokenResponse, previousRefresh?: string): StoredToken {
  const token: StoredToken = {
    accessToken: res.access_token,
    // Spotify a veces no devuelve un refresh token nuevo: conservamos el anterior.
    refreshToken: res.refresh_token ?? previousRefresh ?? '',
    expiresAt: Date.now() + res.expires_in * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return token;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description ?? `Error ${res.status} al pedir el token`);
  }
  return res.json();
}

export function isLoggedIn(): boolean {
  return readToken() !== null;
}

export async function login(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Falta VITE_SPOTIFY_CLIENT_ID en el archivo .env');
  const verifier = randomString(64);
  const state = randomString(16);
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await sha256Base64Url(verifier),
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

// En modo estricto React monta dos veces: el código solo se puede canjear una vez.
let callbackPromise: Promise<void> | null = null;

export function handleCallback(): Promise<void> {
  callbackPromise ??= (async () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) throw new Error(error === 'access_denied' ? 'Cancelaste el login' : error);

    const code = params.get('code');
    const state = params.get('state');
    const verifier = localStorage.getItem(VERIFIER_KEY);
    if (!code || !verifier || state !== localStorage.getItem(STATE_KEY)) {
      throw new Error('Respuesta de login inválida, probá de nuevo');
    }

    const res = await requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });
    saveToken(res);
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem(STATE_KEY);
  })();
  return callbackPromise;
}

let refreshPromise: Promise<StoredToken> | null = null;

async function refresh(token: StoredToken): Promise<StoredToken> {
  refreshPromise ??= requestToken({
    grant_type: 'refresh_token',
    refresh_token: token.refreshToken,
  })
    .then((res) => saveToken(res, token.refreshToken))
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/** Devuelve un access token válido, renovándolo si está por vencer (o si `force`). */
export async function getAccessToken(force = false): Promise<string> {
  const token = readToken();
  if (!token) throw new Error('No hay sesión iniciada');
  if (!force && token.expiresAt - Date.now() > 60_000) return token.accessToken;
  try {
    return (await refresh(token)).accessToken;
  } catch (e) {
    logout();
    throw e;
  }
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}
