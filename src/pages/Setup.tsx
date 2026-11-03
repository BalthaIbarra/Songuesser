import { useState } from 'react';
import { ArtistSearch } from '../components/ArtistSearch';
import { DevicePicker } from '../components/DevicePicker';
import { GenrePicker } from '../components/GenrePicker';
import { PlaylistPicker } from '../components/PlaylistPicker';
import { DIFFICULTIES, type Difficulty } from '../game/difficulty';
import { loadPool, type Pool } from '../game/pool';
import { getRecord, recordKey } from '../game/records';
import type { GameMode, GameSource } from '../game/types';
import type { PlayerControls } from '../hooks/usePlayer';
import { formatPoints } from '../utils/format';

const MODES: { id: GameMode; label: string }[] = [
  { id: 'playlist', label: 'Playlist' },
  { id: 'artist', label: 'Artista' },
  { id: 'genre', label: 'Género' },
];

const ROUND_CHOICES = [5, 10, 15, 20];

export interface SetupChoice {
  rounds: number;
  difficulty: Difficulty;
}

interface Props {
  player: PlayerControls;
  initial: SetupChoice;
  onReady: (source: GameSource, pool: Pool, choice: SetupChoice) => void;
}

export function Setup({ player, initial, onReady }: Props) {
  const [mode, setMode] = useState<GameMode>('playlist');
  const [source, setSource] = useState<GameSource | null>(null);
  const [rounds, setRounds] = useState(initial.rounds);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = progress !== null;
  const selectedId = source?.mode === mode ? source.id : null;
  const record = source ? getRecord(recordKey(source, difficulty, rounds)) : null;

  async function prepare() {
    if (!source) return;
    setError(null);
    setProgress('Buscando canciones…');
    try {
      const pool = await loadPool(source, (done, total) =>
        setProgress(`Buscando canciones… ${Math.round((done / total) * 100)}%`),
      );
      onReady(source, pool, { rounds, difficulty });
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
        <div className="settings">
          <div className="setting">
            <span className="muted small">Dificultad</span>
            <div className="segmented">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  className={`segment ${difficulty === d.id ? 'active' : ''}`}
                  onClick={() => setDifficulty(d.id)}
                  title={`Fragmento de ${d.fragmentMs / 1000} s · puntos x${d.multiplier}`}
                >
                  {d.label} <span className="segment-sub">{d.fragmentMs / 1000}s</span>
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
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
        </div>

        {source && (
          <p className="muted small">
            {record
              ? `🏆 Tu récord acá: ${formatPoints(record.score)} pts (${record.hits}/${record.rounds})`
              : 'Todavía no tenés récord con esta combinación'}
          </p>
        )}
        {error && <p className="error">{error}</p>}

        <DevicePicker player={player} />

        <button className="btn btn-primary btn-lg btn-block" disabled={!source || loading} onClick={prepare}>
          {progress ?? (source ? `Jugar: ${source.name}` : 'Elegí qué querés jugar')}
        </button>
        {!player.ready && !player.error && <p className="muted small">Conectando reproductor…</p>}
      </footer>
    </main>
  );
}
