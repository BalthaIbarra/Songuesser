import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPlayer,
  isSameTrack,
  loadSdk,
  pauseDevice,
  playTrack,
  type Device,
} from '../spotify/player';

const ERROR_MESSAGES: Record<Spotify.ErrorEvent, string> = {
  initialization_error:
    'Este navegador no puede reproducir con Spotify. Usá Chrome, Edge o Firefox de escritorio, o elegí otro dispositivo.',
  authentication_error: 'Spotify rechazó la sesión. Cerrá sesión y volvé a entrar.',
  account_error: 'Esta cuenta no puede usar el reproductor web (hace falta Spotify Premium).',
  playback_error: 'Spotify no pudo reproducir la canción.',
};

/** En otro dispositivo no tenemos eventos del SDK: estimamos cuánto tarda en empezar a sonar. */
const EXTERNAL_START_DELAY_MS = 900;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Resuelve cuando el SDK informa que `uri` está sonando (o al vencer el timeout). */
function waitForPlayback(player: Spotify.Player, uri: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const onState = (s: Spotify.PlaybackState | null) => {
      if (s && !s.paused && isSameTrack(s.track_window.current_track, uri)) done();
    };
    const timer = window.setTimeout(done, timeoutMs);
    function done() {
      window.clearTimeout(timer);
      player.removeListener('player_state_changed', onState);
      resolve();
    }
    player.addListener('player_state_changed', onState);
  });
}

export function usePlayer() {
  const playerRef = useRef<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Otro dispositivo de Spotify Connect elegido en lugar de esta página (null = esta página).
  const [external, setExternal] = useState<Device | null>(null);
  const externalRef = useRef<Device | null>(null);
  externalRef.current = external;
  // Corta el fragmento en curso (lo usa un nuevo play o stop()).
  const cancelRef = useRef<(() => void) | null>(null);
  // Cambia con cada play: permite saber si un fragmento fue reemplazado por otro.
  const playIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let player: Spotify.Player | null = null;

    loadSdk()
      .then(() => {
        if (cancelled) return;
        player = createPlayer();
        playerRef.current = player;
        player.addListener('ready', ({ device_id }) => setDeviceId(device_id));
        player.addListener('not_ready', () => setDeviceId(null));
        (Object.keys(ERROR_MESSAGES) as Spotify.ErrorEvent[]).forEach((event) => {
          player!.addListener(event, (e) => {
            console.error(event, e.message);
            setError(ERROR_MESSAGES[event]);
          });
        });
        player.connect().then((ok) => {
          if (!ok && !cancelled) setError('No se pudo conectar el reproductor de Spotify.');
        });
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
      cancelRef.current?.();
      player?.disconnect();
      playerRef.current = null;
    };
  }, []);

  const pauseNow = useCallback(async () => {
    const ext = externalRef.current;
    await (ext ? pauseDevice(ext.id) : playerRef.current?.pause())?.catch(() => {});
  }, []);

  /** Debe llamarse dentro de un click: habilita el audio en el navegador. */
  const activate = useCallback(async () => {
    if (!externalRef.current) await playerRef.current?.activateElement();
  }, []);

  /**
   * Reproduce `lengthMs` de `uri` desde `startMs` y pausa.
   * Devuelve false si otro fragmento (o stop) lo interrumpió.
   */
  const playFragment = useCallback(
    async (uri: string, startMs: number, lengthMs: number): Promise<boolean> => {
      const ext = externalRef.current;
      const player = playerRef.current;
      const target = ext?.id ?? deviceId;
      if (!target || (!ext && !player)) throw new Error('El reproductor todavía no está listo');

      cancelRef.current?.();
      const playId = ++playIdRef.current;
      let cancelled = false;
      let finish = () => {};
      cancelRef.current = () => {
        cancelled = true;
        finish();
      };

      setError(null);
      const started = ext ? null : waitForPlayback(player!, uri, 5000);
      await playTrack(target, uri, startMs);
      await (started ?? sleep(EXTERNAL_START_DELAY_MS));
      if (cancelled) {
        // stop() llegó mientras arrancaba: la canción empezó igual, hay que pausarla.
        // Si la reemplazó otro fragmento, no tocamos nada.
        if (playId === playIdRef.current) await pauseNow();
        return false;
      }

      setIsPlaying(true);
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, lengthMs);
        finish = () => {
          window.clearTimeout(timer);
          resolve();
        };
      });
      if (cancelled) return false;

      cancelRef.current = null;
      await pauseNow();
      setIsPlaying(false);
      return true;
    },
    [deviceId, pauseNow],
  );

  const stop = useCallback(async () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setIsPlaying(false);
    await pauseNow();
  }, [pauseNow]);

  return {
    ready: external !== null || deviceId !== null,
    /** Error del reproductor de esta página (no aplica si se eligió otro dispositivo). */
    error: external ? null : error,
    isPlaying,
    external,
    selectDevice: setExternal,
    activate,
    playFragment,
    stop,
  };
}

export type PlayerControls = ReturnType<typeof usePlayer>;
