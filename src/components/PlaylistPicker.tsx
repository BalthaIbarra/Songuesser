import { useEffect, useState } from 'react';
import type { GameSource } from '../game/types';
import {
  getLikedCount,
  getMe,
  getMyPlaylists,
  LIKED_SONGS_ID,
  type PlaylistSummary,
} from '../spotify/library';

interface Props {
  selectedId: string | null;
  onSelect: (source: GameSource) => void;
}

export function PlaylistPicker({ selectedId, onSelect }: Props) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => getMyPlaylists(me.id))
      .then(setPlaylists)
      .catch((e: Error) => setError(e.message));
    getLikedCount().then(setLikedCount, () => {});
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!playlists) return <p className="muted">Cargando tus playlists…</p>;

  const readable = playlists.filter((p) => p.readable);
  const saved = playlists.filter((p) => !p.readable);

  return (
    <div className="pick-list">
      <button
        className={`pick-item ${selectedId === LIKED_SONGS_ID ? 'selected' : ''}`}
        onClick={() =>
          onSelect({ mode: 'playlist', id: LIKED_SONGS_ID, name: 'Canciones que te gustan', imageUrl: null })
        }
      >
        <span className="pick-thumb liked">♥</span>
        <span className="pick-text">
          <strong>Canciones que te gustan</strong>
          <span className="muted small">{likedCount !== null ? `${likedCount} canciones` : ' '}</span>
        </span>
      </button>

      {readable.map((p) => (
        <button
          key={p.id}
          className={`pick-item ${selectedId === p.id ? 'selected' : ''}`}
          onClick={() => onSelect({ mode: 'playlist', id: p.id, name: p.name, imageUrl: p.imageUrl })}
        >
          <Thumb url={p.imageUrl} />
          <span className="pick-text">
            <strong>{p.name}</strong>
            <span className="muted small">{p.total !== null ? `${p.total} canciones` : p.owner}</span>
          </span>
        </button>
      ))}

      {saved.length > 0 && (
        <>
          <p className="muted small pick-heading">
            Guardadas de otras personas: Spotify no deja leerlas desde apps en modo desarrollo. Para
            jugarlas, en Spotify abrí la playlist → "…" → "Agregar a otra playlist" → "Nueva playlist".
          </p>
          {saved.map((p) => (
            <div key={p.id} className="pick-item disabled" title="Duplicala en Spotify para jugar">
              <Thumb url={p.imageUrl} />
              <span className="pick-text">
                <strong>{p.name}</strong>
                <span className="muted small">de {p.owner} · duplicala para jugar</span>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return url ? <img className="pick-thumb" src={url} alt="" loading="lazy" /> : <span className="pick-thumb">♪</span>;
}
