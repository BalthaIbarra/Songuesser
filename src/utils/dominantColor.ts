// Color predominante de una portada, calculado con un canvas chico (sin librerías).

const SIZE = 32;
const cache = new Map<string, Promise<string | null>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // las portadas de Spotify permiten CORS; sin esto el canvas no se puede leer
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function compute(url: string): Promise<string | null> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  c.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = c.getImageData(0, 0, SIZE, SIZE);

  // Agrupamos píxeles en "cubetas" de color; gana la que más pesa,
  // y pesan más los píxeles saturados (los grises y negros casi no cuentan).
  const buckets = new Map<number, { r: number; g: number; b: number; w: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const [, s, l] = rgbToHsl(r, g, b);
    if (l < 0.08 || l > 0.95) continue;
    const w = 0.15 + s * s;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
    bucket.r += r * w;
    bucket.g += g * w;
    bucket.b += b * w;
    bucket.w += w;
    buckets.set(key, bucket);
  }

  let best: { r: number; g: number; b: number; w: number } | null = null;
  for (const bucket of buckets.values()) if (!best || bucket.w > best.w) best = bucket;
  if (!best) return null;

  const [h, s, l] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
  // Lo llevamos a un rango que quede bien como fondo oscuro: ni apagado ni chillón.
  const sat = Math.round(Math.min(0.75, Math.max(0.35, s)) * 100);
  const light = Math.round(Math.min(0.5, Math.max(0.32, l)) * 100);
  return `hsl(${Math.round(h)} ${sat}% ${light}%)`;
}

/** Devuelve un color CSS o null si no se pudo leer la imagen. Cachea por URL. */
export function getDominantColor(url: string): Promise<string | null> {
  let p = cache.get(url);
  if (!p) {
    p = compute(url).catch(() => null);
    cache.set(url, p);
  }
  return p;
}
