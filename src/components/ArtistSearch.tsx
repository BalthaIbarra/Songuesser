import { useEffect, useState } from 'react';
import type { GameSource } from '../game/types';
import { searchArtists, type ArtistSummary } from '../spotify/library';

interface Props {
  selectedId: string | null;
  onSelect: (source: GameSource) => void;
}

export function ArtistSearch({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    // Esperamos a que deje de escribir para no gastar pedidos.
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchArtists(q)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
          setError(null);
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="pick-list">
      <input
        className="input"
        type="search"
        placeholder="Buscá un artista o banda…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {loading && <p className="muted small">Buscando…</p>}
      {error && <p className="error">{error}</p>}
      {results.map((a) => (
        <button
          key={a.id}
          className={`pick-item ${selectedId === a.id ? 'selected' : ''}`}
          onClick={() => onSelect({ mode: 'artist', id: a.id, name: a.name, imageUrl: a.imageUrl })}
        >
          {a.imageUrl ? (
            <img className="pick-thumb round" src={a.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="pick-thumb round">♪</span>
          )}
          <span className="pick-text">
            <strong>{a.name}</strong>
          </span>
        </button>
      ))}
    </div>
  );
}
