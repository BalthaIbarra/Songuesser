import { useEffect, useState } from 'react';
import { handleCallback } from '../spotify/auth';

export function Callback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback()
      .then(() => window.location.replace('/'))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="screen center">
      {error ? (
        <>
          <p className="error">{error}</p>
          <a className="btn btn-primary" href="/">
            Volver
          </a>
        </>
      ) : (
        <p className="muted">Conectando con Spotify…</p>
      )}
    </main>
  );
}
