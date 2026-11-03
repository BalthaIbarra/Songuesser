const BARS = 7;

/** Barras que se mueven mientras suena el fragmento; quietas cuando no. */
export function SoundWaves({ active }: { active: boolean }) {
  return (
    <div className={`waves ${active ? 'active' : ''}`} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i * 0.13) % 0.6}s` }} />
      ))}
    </div>
  );
}
