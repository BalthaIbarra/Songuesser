import { spotifyFetch } from './api';
import { getAccessToken } from './auth';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
export const DEVICE_NAME = 'Adiviná la canción';

let sdkPromise: Promise<void> | null = null;

/** Carga el script del SDK una sola vez. */
export function loadSdk(): Promise<void> {
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    if (window.Spotify) return resolve();
    // El SDK llama a esta función global cuando terminó de cargar.
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error('No se pudo cargar el Web Playback SDK'));
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export function createPlayer(): Spotify.Player {
  return new window.Spotify!.Player({
    name: DEVICE_NAME,
    volume: 0.8,
    getOAuthToken: (cb) => {
      getAccessToken().then(cb, () => cb(''));
    },
  });
}

/** Le pide a Spotify que reproduzca `uri` en nuestro dispositivo, desde `positionMs`. */
export function playTrack(deviceId: string, uri: string, positionMs: number): Promise<void> {
  return spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri], position_ms: Math.max(0, Math.floor(positionMs)) }),
  });
}

export interface Device {
  id: string;
  name: string;
  type: string;
}

interface ApiDevice {
  id: string | null;
  name: string;
  type: string;
  is_restricted: boolean;
}

/** Dispositivos de Spotify Connect disponibles (app de Spotify abierta en celular, PC, parlante…). */
export async function getDevices(): Promise<Device[]> {
  const res = await spotifyFetch<{ devices: ApiDevice[] }>('/me/player/devices');
  return res.devices
    .filter((d): d is ApiDevice & { id: string } => !!d.id && !d.is_restricted && d.name !== DEVICE_NAME)
    .map((d) => ({ id: d.id, name: d.name, type: d.type }));
}

export function pauseDevice(deviceId: string): Promise<void> {
  return spotifyFetch(`/me/player/pause?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT' });
}

/** Coincide aunque Spotify haya "relinkeado" la canción a otra versión del mercado. */
export function isSameTrack(sdkTrack: Spotify.SdkTrack, uri: string): boolean {
  return sdkTrack.uri === uri || sdkTrack.linked_from?.uri === uri;
}
