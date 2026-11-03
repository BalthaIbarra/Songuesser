// Etapa 1: prueba de login + reproducción de un fragmento dentro de la página.
import { useEffect, useState } from 'react';
import { randomStartMs } from '../game/fragment';
import type { Track } from '../game/types';
import { usePlayer } from '../hooks/usePlayer';
import { logout } from '../spotify/auth';
import { getMe, getRandomLikedTrack } from '../spotify/library';

const FRAGMENT_MS = 10_000;

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PlayerTest() {
  const { ready, error: playerError, isPlaying, activate, playFragment } = usePlayer();
  const [name, setName] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => setName(me.display_name ?? me.id))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function play(t: Track, start: number) {
    setRevealed(false);
    setError(null);
    try {
      const finished = await playFragment(t.uri, start, FRAGMENT_MS);
      if (finished) setRevealed(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function playNewTrack() {
    setLoading(true);
    try {
      // activateElement tiene que ejecutarse dentro del click para que el navegador permita el audio.
      await activate();
      const t = await getRandomLikedTrack();
      const start = randomStartMs(t.durationMs, FRAGMENT_MS);
      setTrack(t);
      setStartMs(start);
      setLoading(false);
      await play(t, start);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  function signOut() {
    logout();
    window.location.replace('/');
  }

  const shownError = error ?? playerError;

  return (
    <main className="screen center">
      <header className="topbar">
        <span className="muted">{name ? `Hola, ${name}` : ' '}</span>
        <button className="btn btn-ghost" onClick={signOut}>
          Cerrar sesión
        </button>
      </header>

      <h1 className="title">Prueba de reproducción</h1>
      <p className="muted">
        {ready ? 'Reproductor conectado ✔' : shownError ? 'Reproductor con error' : 'Conectando reproductor…'}
      </p>

      {!track ? (
        <button className="btn btn-primary btn-lg" disabled={!ready || loading} onClick={playNewTrack}>
          {loading ? 'Buscando canción…' : 'Empezar partida'}
        </button>
      ) : (
        <section className="card">
          {isPlaying && <p className="playing">♪ Sonando… ({FRAGMENT_MS / 1000} s)</p>}
          {revealed ? (
            <div className="track">
              {track.album.imageUrl && <img src={track.album.imageUrl} alt="" width={160} height={160} />}
              <strong>{track.name}</strong>
              <span className="muted">{track.artists.map((a) => a.name).join(', ')}</span>
              <span className="muted small">Fragmento desde {formatTime(startMs)}</span>
            </div>
          ) : (
            !isPlaying && <p className="muted">Preparando…</p>
          )}
          <div className="row">
            <button className="btn" disabled={isPlaying || loading} onClick={() => play(track, startMs)}>
              Volver a escuchar
            </button>
            <button className="btn btn-primary" disabled={loading} onClick={playNewTrack}>
              {loading ? 'Buscando…' : 'Otra canción'}
            </button>
          </div>
        </section>
      )}

      {shownError && <p className="error">{shownError}</p>}
    </main>
  );
}
