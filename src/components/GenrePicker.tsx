import { GENRES } from '../game/genres';
import type { GameSource } from '../game/types';

interface Props {
  selectedId: string | null;
  onSelect: (source: GameSource) => void;
}

export function GenrePicker({ selectedId, onSelect }: Props) {
  return (
    <div className="genre-grid">
      {GENRES.map((g) => (
        <button
          key={g.id}
          className={`genre-item ${selectedId === g.id ? 'selected' : ''}`}
          onClick={() => onSelect({ mode: 'genre', id: g.id, name: g.name, imageUrl: null })}
        >
          <span className="genre-emoji">{g.emoji}</span>
          {g.name}
        </button>
      ))}
    </div>
  );
}
