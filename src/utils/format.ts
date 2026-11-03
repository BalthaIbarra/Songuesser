import type { Track } from '../game/types';

export const artistNames = (t: Track) => t.artists.map((a) => a.name).join(', ');

export const formatPoints = (n: number) => n.toLocaleString('es-AR');
