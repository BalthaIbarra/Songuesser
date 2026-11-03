import { useEffect, useRef, useState } from 'react';
import { Backdrop } from '../components/Backdrop';
import { OptionButton, type OptionState } from '../components/OptionButton';
import { SoundWaves } from '../components/SoundWaves';
import type { DifficultyConfig } from '../game/difficulty';
import { buildRounds } from '../game/options';
import type { Pool } from '../game/pool';
import { pointsFor, streaks } from '../game/scoring';
import type { Answer, GameSource, Round, Track } from '../game/types';
import type { PlayerControls } from '../hooks/usePlayer';
import { getDominantColor } from '../utils/dominantColor';
import { artistNames, formatPoints } from '../utils/format';
import { isMuted, playHit, playMiss, setMuted } from '../utils/sfx';
import { Summary } from './Summary';

type Phase = 'ready' | 'round' | 'finished';

interface Props {
  source: GameSource;
  pool: Pool;
  roundsCount: number;
  difficulty: DifficultyConfig;
  player: PlayerControls;
  onExit: () => void;
}

export function Game({ source, pool, roundsCount, difficulty, player, onExit }: Props) {
  const newRounds = () => buildRounds(pool.tracks, source.mode, roundsCount, difficulty.fragmentMs);
  const [rounds, setRounds] = useState<Round[]>(newRounds);
  const [phase, setPhase] = useState<Phase>('ready');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Portada de la última respuesta: se mantiene mientras el fondo se desvanece al pasar de ronda.
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  // Color predominante de la portada, asociado a su URL para no mezclar rondas.
  const [tint, setTint] = useState<{ url: string; color: string } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  // Momento en que empezó a sonar la ronda actual (los "volver a escuchar" no lo reinician).
  const roundStartRef = useRef<number | null>(null);

  const { stop, isPlaying } = player;
  useEffect(() => () => void stop(), [stop]);

  useEffect(() => {
    if (isPlaying && roundStartRef.current === null) roundStartRef.current = performance.now();
  }, [isPlaying]);

  const round = rounds[index];

  // Calculamos el color mientras suena la ronda, así ya está listo al responder.
  const coverUrl = round?.track.album.imageUrl ?? null;
  useEffect(() => {
    if (!coverUrl) return;
    let cancelled = false;
    getDominantColor(coverUrl).then((color) => {
      if (!cancelled && color) setTint({ url: coverUrl, color });
    });
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);
  const answer = answers[index] as Answer | undefined;
  const score = answers.reduce((sum, a) => sum + a.points, 0);
  const streak = streaks(answers.map((a) => a.correct));

  async function play(r: Round) {
    setError(null);
    try {
      await player.playFragment(r.track.uri, r.startMs, difficulty.fragmentMs);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function beginRound(list: Round[], i: number) {
    roundStartRef.current = null;
    setIndex(i);
    play(list[i]);
  }

  async function start(list: Round[]) {
    // Dentro del click: habilita el audio en el navegador.
    await player.activate();
    setPhase('round');
    beginRound(list, 0);
  }

  function choose(trackId: string) {
    if (answer) return;
    const elapsedMs = roundStartRef.current === null ? 0 : performance.now() - roundStartRef.current;
    const correct = trackId === round.track.id;
    setAnswers((a) => [
      ...a,
      { chosenId: trackId, correct, elapsedMs, points: pointsFor(correct, elapsedMs, difficulty) },
    ]);
    setBackdropUrl(round.track.album.imageUrl);
    if (correct) playHit();
    else playMiss();
    void stop();
  }

  function toggleMute() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      setPhase('finished');
      return;
    }
    beginRound(rounds, index + 1);
  }

  function playAgain() {
    const list = newRounds();
    setRounds(list);
    setAnswers([]);
    start(list);
  }

  function optionState(t: Track): OptionState {
    if (!answer) return 'idle';
    if (t.id === round.track.id) return 'correct';
    if (t.id === answer.chosenId) return 'wrong';
    return 'dimmed';
  }

  return (
    <div className="page">
      <Backdrop
        imageUrl={backdropUrl}
        // Con cada acierto, el fondo toma el color de la portada.
        tint={answer?.correct && tint?.url === backdropUrl ? tint.color : null}
        visible={phase === 'round' && !!answer}
      />
      <header className="game-header">
        <button className="btn btn-ghost" onClick={onExit}>
          ← Salir
        </button>
        <div className="game-title">
          <strong>{source.name}</strong>
          <span className="muted small">
            {difficulty.label} · {difficulty.fragmentMs / 1000} s{pool.note ? ` · ${pool.note}` : ''}
          </span>
        </div>
        <div className="header-right">
          <span className="muted small">
            {phase === 'round' ? `${index + 1}/${rounds.length}` : `${rounds.length} rondas`}
          </span>
          <button
            className="btn btn-ghost icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Activar sonidos' : 'Silenciar sonidos'}
            title={muted ? 'Activar sonidos de acierto/error' : 'Silenciar sonidos de acierto/error'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>
      {phase === 'ready' && renderReady()}
      {phase === 'round' && renderRound()}
      {phase === 'finished' && (
        <Summary
          source={source}
          rounds={rounds}
          answers={answers}
          difficulty={difficulty}
          onExit={onExit}
          onPlayAgain={playAgain}
        />
      )}
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
        {player.external && <p className="muted small">🔈 Suena en: {player.external.name}</p>}
        <button className="btn btn-primary btn-lg glow" disabled={!player.ready} onClick={() => start(rounds)}>
          {player.ready ? 'Empezar partida' : 'Conectando reproductor…'}
        </button>
        {player.error && <p className="error">{player.error}</p>}
      </main>
    );
  }

  function renderRound() {
    return (
      <main className="screen game">
        <div className="scorebar">
          <span>
            <strong>{formatPoints(score)}</strong> <span className="muted">pts</span>
          </span>
          {/* La key reinicia la animación cada vez que cambia la racha. */}
          <span key={streak.current} className={`streak ${streak.current >= 2 ? 'hot' : ''}`}>
            🔥 {streak.current} {streak.current === 1 ? 'acierto' : 'aciertos'} seguidos
          </span>
        </div>

        <section className="stage">
          {answer ? (
            <div className="reveal" key={`reveal-${index}`}>
              {round.track.album.imageUrl && <img src={round.track.album.imageUrl} alt="" />}
              <p className={answer.correct ? 'hit-text' : 'miss-text'}>
                {answer.correct
                  ? `¡Correcto! +${answer.points} (${(answer.elapsedMs / 1000).toFixed(1)} s)`
                  : 'Era esta:'}
              </p>
              <strong>{round.track.name}</strong>
              <span className="muted">{artistNames(round.track)}</span>
            </div>
          ) : (
            <div className="mystery" key={`mystery-${index}`}>
              <div className={`mystery-cover ${player.isPlaying ? 'playing' : ''}`}>
                <SoundWaves active={player.isPlaying} />
              </div>
              <div className="fragment-progress">
                {/* Se monta de nuevo en cada reproducción, así la barra arranca desde cero. */}
                {player.isPlaying && (
                  <span style={{ animationDuration: `${difficulty.fragmentMs}ms` }} />
                )}
              </div>
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
              disabled={!!answer}
              onClick={() => choose(t.id)}
            />
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="row">
          <button className="btn" disabled={player.isPlaying} onClick={() => play(round)}>
            ↻ Volver a escuchar
          </button>
          {answer && (
            <button className="btn btn-primary" onClick={next}>
              {index + 1 >= rounds.length ? 'Ver resultado' : 'Siguiente →'}
            </button>
          )}
        </div>
      </main>
    );
  }
}
