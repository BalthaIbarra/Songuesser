// Sonidos cortos de acierto/error sintetizados con Web Audio (sin archivos).

const MUTE_KEY = 'sfx-muted';

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  startS: number,
  durationS: number,
  type: OscillatorType = 'sine',
  volume = 0.18,
) {
  const ac = audio();
  const t0 = ac.currentTime + startS;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  // Ataque corto y caída exponencial: suena a "bip" y no a click.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationS);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationS + 0.05);
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // sin almacenamiento: vale solo para esta sesión
  }
}

export function playHit(): void {
  if (isMuted()) return;
  tone(659, 0, 0.14, 'triangle'); // Mi
  tone(988, 0.09, 0.26, 'triangle'); // Si, una quinta arriba
}

export function playMiss(): void {
  if (isMuted()) return;
  tone(220, 0, 0.18, 'square', 0.08);
  tone(165, 0.12, 0.3, 'square', 0.08);
}
