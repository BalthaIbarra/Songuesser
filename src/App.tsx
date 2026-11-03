import { useState } from 'react';
import type { Pool } from './game/pool';
import type { GameSource } from './game/types';
import { usePlayer } from './hooks/usePlayer';
import { Callback } from './pages/Callback';
import { Game } from './pages/Game';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { isLoggedIn, logout } from './spotify/auth';

export default function App() {
  if (window.location.pathname === '/callback') return <Callback />;
  return isLoggedIn() ? <LoggedIn /> : <Login />;
}

interface GameConfig {
  source: GameSource;
  pool: Pool;
  rounds: number;
}

function LoggedIn() {
  // El reproductor vive acá para que siga conectado entre la configuración y la partida.
  const player = usePlayer();
  const [game, setGame] = useState<GameConfig | null>(null);
  const [lastRounds, setLastRounds] = useState(10);

  if (game) {
    return (
      <Game
        source={game.source}
        pool={game.pool}
        roundsCount={game.rounds}
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
        initialRounds={lastRounds}
        onReady={(source, pool, rounds) => {
          setLastRounds(rounds);
          setGame({ source, pool, rounds });
        }}
      />
    </>
  );
}
