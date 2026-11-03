import { useState } from 'react';
import { getDifficulty } from './game/difficulty';
import type { Pool } from './game/pool';
import type { GameSource } from './game/types';
import { usePlayer } from './hooks/usePlayer';
import { Callback } from './pages/Callback';
import { Game } from './pages/Game';
import { Login } from './pages/Login';
import { Setup, type SetupChoice } from './pages/Setup';
import { isLoggedIn, logout } from './spotify/auth';

export default function App() {
  if (window.location.pathname === '/callback') return <Callback />;
  return isLoggedIn() ? <LoggedIn /> : <Login />;
}

interface GameConfig {
  source: GameSource;
  pool: Pool;
  choice: SetupChoice;
}

function LoggedIn() {
  // El reproductor vive acá para que siga conectado entre la configuración y la partida.
  const player = usePlayer();
  const [game, setGame] = useState<GameConfig | null>(null);
  const [lastChoice, setLastChoice] = useState<SetupChoice>({ rounds: 10, difficulty: 'medium' });

  if (game) {
    return (
      <Game
        source={game.source}
        pool={game.pool}
        roundsCount={game.choice.rounds}
        difficulty={getDifficulty(game.choice.difficulty)}
        player={player}
        onExit={() => setGame(null)}
      />
    );
  }

  return (
    <>
      <button
        className="btn btn-ghost logout"
        onClick={() => {
          logout();
          window.location.replace('/');
        }}
      >
        Cerrar sesión
      </button>
      <Setup
        playerReady={player.ready}
        playerError={player.error}
        initial={lastChoice}
        onReady={(source, pool, choice) => {
          setLastChoice(choice);
          setGame({ source, pool, choice });
        }}
      />
    </>
  );
}
