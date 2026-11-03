export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { name: string; imageUrl: string | null };
  durationMs: number;
  isrc: string | null;
}
