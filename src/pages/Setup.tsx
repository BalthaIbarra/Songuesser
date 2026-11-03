import { useState } from 'react';
import { ArtistSearch } from '../components/ArtistSearch';
import { GenrePicker } from '../components/GenrePicker';
import { PlaylistPicker } from '../components/PlaylistPicker';
import { loadPool, type Pool } from '../game/pool';
import type { GameMode, GameSource } from '../game/types';

const MODES: { id: GameMode; label: string }[] = [
  { id: 'playlist', label: 'Playlist' },
  { id: 'artist', label: 'Artista' },
  { id: 'genre', label: 'Género' },
];

const ROUND_CHOICES = [5, 10, 15, 20];

interface Props {
  playerReady: boolean;
  playerError: string | null;
  initialRounds: number;
  onReady: (source: GameSource, pool: Pool, rounds: number) => void;
}

export function Setup({ playerReady, playerError, initialRounds, onReady }: Props) {
  const [mode, setMode] = useState<GameMode>('playlist');
  const [source, setSource] = useState<GameSource | null>(null);
  const [rounds, setRounds] = useState(initialRounds);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = progress !== null;
  const selectedId = source?.mode === mode ? source.id : null;

  async function prepare() {
    if (!source) return;
    setError(null);
    setProgress('Buscando canciones…');
    try {
      const pool = await loadPool(source, (done, total) =>
        setProgress(`Buscando canciones… ${Math.round((done / total) * 100)}%`),
      );
      onReady(source, pool, rounds);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    }
  }

  return (
    <main className="screen setup">
      <h1 className="title">Adiviná la canción</h1>

      <div className="tabs" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={`tab ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <section className="setup-body">
        {mode === 'playlist' && <PlaylistPicker selectedId={selectedId} onSelect={setSource} />}
        {mode === 'artist' && <ArtistSearch selectedId={selectedId} onSelect={setSource} />}
        {mode === 'genre' && <GenrePicker selectedId={selectedId} onSelect={setSource} />}
      </section>

      <footer className="setup-footer">
        <div className="rounds">
          <span className="muted small">Rondas</span>
          <div className="segmented">
            {ROUND_CHOICES.map((n) => (
              <button
                key={n}
                className={`segment ${rounds === n ? 'active' : ''}`}
                onClick={() => setRounds(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {playerError && <p className="error">{playerError}</p>}

        <button className="btn btn-primary btn-lg btn-block" disabled={!source || loading} onClick={prepare}>
          {progress ?? (source ? `Jugar: ${source.name}` : 'Elegí qué querés jugar')}
        </button>
        {!playerReady && !playerError && <p className="muted small">Conectando reproductor…</p>}
      </footer>
    </main>
  );
}
