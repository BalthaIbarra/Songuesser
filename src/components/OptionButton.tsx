import type { Track } from '../game/types';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

interface Props {
  track: Track;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

export function OptionButton({ track, state, disabled, onClick }: Props) {
  return (
    <button className={`option option-${state}`} disabled={disabled} onClick={onClick}>
      <strong>{track.name}</strong>
      <span className="option-artist">{track.artists.map((a) => a.name).join(', ')}</span>
    </button>
  );
}
