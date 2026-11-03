import { useEffect, useState } from 'react';
import { OptionButton, type OptionState } from '../components/OptionButton';
import { buildRounds } from '../game/options';
import type { Pool } from '../game/pool';
import type { GameSource, Round, Track } from '../game/types';
import type { PlayerControls } from '../hooks/usePlayer';

// La dificultad (15/10/5 s) llega en la etapa 3.
const FRAGMENT_MS = 10_000;

type Phase = 'ready' | 'round' | 'finished';

interface Props {
  source: GameSource;
  pool: Pool;
  roundsCount: number;
  player: PlayerControls;
  onExit: () => void;
}

const artistNames = (t: Track) => t.artists.map((a) => a.name).join(', ');

export function Game({ source, pool, roundsCount, player, onExit }: Props) {
  const newRounds = () => buildRounds(pool.tracks, source.mode, roundsCount, FRAGMENT_MS);
  const [rounds, setRounds] = useState<Round[]>(newRounds);
  const [phase, setPhase] = useState<Phase>('ready');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]); // id elegido en cada ronda respondida
  const [error, setError] = useState<string | null>(null);

  const { stop } = player;
  useEffect(() => () => void stop(), [stop]);

  const round = rounds[index];
  const answered = answers.length > index;
  const chosenId = answers[index];
  const hits = answers.filter((id, i) => id === rounds[i].track.id).length;

  async function play(r: Round) {
    setError(null);
    try {
      await player.playFragment(r.track.uri, r.startMs, FRAGMENT_MS);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function start(list: Round[]) {
    // Dentro del click: habilita el audio en el navegador.
    await player.activate();
    setPhase('round');
    play(list[0]);
  }

  function choose(trackId: string) {
    if (answered) return;
    setAnswers((a) => [...a, trackId]);
    void stop();
  }

  function next() {
    if (index + 1 >= rounds.length) {
      setPhase('finished');
      return;
    }
    setIndex(index + 1);
    play(rounds[index + 1]);
  }

  function playAgain() {
    const list = newRounds();
    setRounds(list);
    setIndex(0);
    setAnswers([]);
    start(list);
  }

  function optionState(t: Track): OptionState {
    if (!answered) return 'idle';
    if (t.id === round.track.id) return 'correct';
    if (t.id === chosenId) return 'wrong';
    return 'dimmed';
  }

  const header = (
    <header className="game-header">
      <button className="btn btn-ghost" onClick={onExit}>
        ← Salir
      </button>
      <div className="game-title">
        <strong>{source.name}</strong>
        {pool.note && <span className="muted small">{pool.note}</span>}
      </div>
      <span className="muted small">
        {phase === 'round' ? `${index + 1}/${rounds.length}` : `${rounds.length} rondas`}
      </span>
    </header>
  );

  return (
    <div className="page">
      {header}
      {phase === 'ready' ? renderReady() : phase === 'finished' ? renderFinished() : renderRound()}
    </div>
  );

  function renderReady() {
    return (
      <main className="screen center">
        <p className="muted">
          {rounds.length} rondas · {pool.tracks.length} canciones disponibles
        </p>
        {rounds.length < roundsCount && (
          <p className="muted small">No hay canciones suficientes para {roundsCount} rondas.</p>
        )}
        <button className="btn btn-primary btn-lg" disabled={!player.ready} onClick={() => start(rounds)}>
          {player.ready ? 'Empezar partida' : 'Conectando reproductor…'}
        </button>
        {player.error && <p className="error">{player.error}</p>}
      </main>
    );
  }

  function renderFinished() {
    return (
      <main className="screen">
        <h2 className="title center-text">
          {hits} de {rounds.length} aciertos
        </h2>
        <ol className="results">
          {rounds.map((r, i) => (
            <li key={r.track.id} className={answers[i] === r.track.id ? 'hit' : 'miss'}>
              <span>{answers[i] === r.track.id ? '✔' : '✘'}</span>
              <span>
                <strong>{r.track.name}</strong> · <span className="muted">{artistNames(r.track)}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="row">
          <button className="btn" onClick={onExit}>
            Elegir otra cosa
          </button>
          <button className="btn btn-primary" onClick={playAgain}>
            Jugar de nuevo
          </button>
        </div>
      </main>
    );
  }

  function renderRound() {
    return (
      <main className="screen game">
        <section className="stage">
          {answered ? (
            <div className="reveal">
              {round.track.album.imageUrl && <img src={round.track.album.imageUrl} alt="" />}
              <p className={chosenId === round.track.id ? 'hit-text' : 'miss-text'}>
                {chosenId === round.track.id ? '¡Correcto!' : 'Era esta:'}
              </p>
              <strong>{round.track.name}</strong>
              <span className="muted">{artistNames(round.track)}</span>
            </div>
          ) : (
            <div className="mystery">
              <span className="mystery-cover">{player.isPlaying ? '♪' : '?'}</span>
              <p className="muted">{player.isPlaying ? 'Sonando…' : '¿Qué canción es?'}</p>
            </div>
          )}
        </section>

        <div className="options">
          {round.options.map((t) => (
            <OptionButton
              key={t.id}
              track={t}
              state={optionState(t)}
              disabled={answered}
              onClick={() => choose(t.id)}
            />
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="row">
          <button className="btn" disabled={player.isPlaying} onClick={() => play(round)}>
            ↻ Volver a escuchar
          </button>
          {answered && (
            <button className="btn btn-primary" onClick={next}>
              {index + 1 >= rounds.length ? 'Ver resultado' : 'Siguiente →'}
            </button>
          )}
        </div>
      </main>
    );
  }
}
