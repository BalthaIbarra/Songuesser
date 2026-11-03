import { useState } from 'react';
import { login } from '../spotify/auth';

export function Login() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="screen center">
      <h1 className="title">Adiviná la canción</h1>
      <p className="muted">Conectá tu cuenta de Spotify Premium para jugar.</p>
      <button className="btn btn-primary btn-lg" onClick={() => login().catch((e) => setError(e.message))}>
        Entrar con Spotify
      </button>
      {error && <p className="error">{error}</p>}
    </main>
  );
}
