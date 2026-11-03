import { useEffect, useState } from 'react';
import type { DifficultyConfig } from '../game/difficulty';
import { getRecord, isNewRecord, recordKey, saveRecord } from '../game/records';
import { streaks } from '../game/scoring';
import type { Answer, GameSource, Round } from '../game/types';
import { artistNames, formatPoints } from '../utils/format';

interface Props {
  source: GameSource;
  rounds: Round[];
  answers: Answer[];
  difficulty: DifficultyConfig;
  onExit: () => void;
  onPlayAgain: () => void;
}

export function Summary({ source, rounds, answers, difficulty, onExit, onPlayAgain }: Props) {
  const score = answers.reduce((sum, a) => sum + a.points, 0);
  const hits = answers.filter((a) => a.correct).length;
  const bestStreak = streaks(answers.map((a) => a.correct)).best;
  const key = recordKey(source, difficulty.id, rounds.length);

  // El récord anterior se lee una sola vez, antes de guardar el nuevo.
  const [previous] = useState(() => getRecord(key));
  const isNew = isNewRecord(score, previous);

  useEffect(() => {
    if (isNew) {
      saveRecord(key, { score, hits, rounds: rounds.length, bestStreak, date: new Date().toISOString() });
    }
  }, [isNew, key, score, hits, rounds.length, bestStreak]);

  let recordText = '';
  if (previous) {
    recordText = `${isNew ? 'Récord anterior' : 'Tu récord'}: ${formatPoints(previous.score)} pts`;
  } else if (isNew) {
    recordText = 'Primer récord en este modo';
  }

  return (
    <main className="screen summary">
      <section className="summary-head">
        {isNew && <p className="record-badge">🏆 ¡Nuevo récord!</p>}
        <h2 className="title">{formatPoints(score)} pts</h2>
        <div className="summary-stats">
          <span>
            <strong className="hit-text">{hits}</strong> aciertos
          </span>
          <span>
            <strong className="miss-text">{rounds.length - hits}</strong> errores
          </span>
          <span>
            <strong>🔥 {bestStreak}</strong> mejor racha
          </span>
        </div>
        <p className="muted small">
          {recordText && `${recordText} · `}
          {difficulty.label}, {rounds.length} rondas
        </p>
      </section>

      <ol className="results">
        {rounds.map((r, i) => {
          const a = answers[i];
          return (
            <li key={r.track.id} className={a?.correct ? 'hit' : 'miss'}>
              {r.track.album.imageUrl ? (
                <img className="result-cover" src={r.track.album.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="result-cover">♪</span>
              )}
              <span className="result-text">
                <strong>{r.track.name}</strong>
                <span className="muted small">{artistNames(r.track)}</span>
              </span>
              <span className="result-points">{a?.correct ? `+${formatPoints(a.points)}` : '✘'}</span>
            </li>
          );
        })}
      </ol>

      <div className="row">
        <button className="btn" onClick={onExit}>
          Elegir otra cosa
        </button>
        <button className="btn btn-primary" onClick={onPlayAgain}>
          Jugar de nuevo
        </button>
      </div>
    </main>
  );
}
