import { useCallback, useEffect, useRef, useState } from 'react';
import { createPlayer, isSameTrack, loadSdk, playTrack } from '../spotify/player';

const ERROR_MESSAGES: Record<Spotify.ErrorEvent, string> = {
  initialization_error:
    'Tu navegador no puede reproducir con Spotify. Usá Chrome, Edge o Firefox de escritorio.',
  authentication_error: 'Spotify rechazó la sesión. Cerrá sesión y volvé a entrar.',
  account_error: 'Esta cuenta no puede usar el reproductor web (hace falta Spotify Premium).',
  playback_error: 'Spotify no pudo reproducir la canción.',
};

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
  // Corta el fragmento en curso (lo usa un nuevo play o stop()).
  const cancelRef = useRef<(() => void) | null>(null);

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

  /** Debe llamarse dentro de un click: habilita el audio en el navegador. */
  const activate = useCallback(async () => {
    await playerRef.current?.activateElement();
  }, []);

  /**
   * Reproduce `lengthMs` de `uri` desde `startMs` y pausa.
   * Devuelve false si otro fragmento (o stop) lo interrumpió.
   */
  const playFragment = useCallback(
    async (uri: string, startMs: number, lengthMs: number): Promise<boolean> => {
      const player = playerRef.current;
      if (!player || !deviceId) throw new Error('El reproductor todavía no está listo');

      cancelRef.current?.();
      let cancelled = false;
      let finish = () => {};
      cancelRef.current = () => {
        cancelled = true;
        finish();
      };

      setError(null);
      const started = waitForPlayback(player, uri, 5000);
      await playTrack(deviceId, uri, startMs);
      await started;
      if (cancelled) return false;

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
      await player.pause();
      setIsPlaying(false);
      return true;
    },
    [deviceId],
  );

  const stop = useCallback(async () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setIsPlaying(false);
    await playerRef.current?.pause();
  }, []);

  return { ready: deviceId !== null, error, isPlaying, activate, playFragment, stop };
}
