export interface Genre {
  id: string;
  name: string;
  emoji: string;
  /** Texto para el filtro de búsqueda `genre:"…"` de Spotify (plan A). */
  query: string;
  /** Artistas típicos, por si el filtro de género no devuelve resultados (plan B). */
  artists: string[];
}

export const GENRES: Genre[] = [
  {
    id: 'rock',
    name: 'Rock',
    emoji: '🎸',
    query: 'rock',
    artists: ['Queen', 'AC/DC', 'The Rolling Stones', 'Led Zeppelin', "Guns N' Roses", 'Nirvana', 'Foo Fighters', 'Aerosmith'],
  },
  {
    id: 'rock-nacional',
    name: 'Rock nacional',
    emoji: '🇦🇷',
    query: 'rock argentino',
    artists: ['Soda Stereo', 'Charly García', 'Patricio Rey y sus Redonditos de Ricota', 'Divididos', 'Los Fabulosos Cadillacs', 'Gustavo Cerati', 'Andrés Calamaro', 'Los Piojos'],
  },
  {
    id: 'pop',
    name: 'Pop',
    emoji: '✨',
    query: 'pop',
    artists: ['Taylor Swift', 'Dua Lipa', 'Ed Sheeran', 'Ariana Grande', 'The Weeknd', 'Bruno Mars', 'Harry Styles', 'Lady Gaga'],
  },
  {
    id: 'reggaeton',
    name: 'Reggaetón',
    emoji: '🔥',
    query: 'reggaeton',
    artists: ['Bad Bunny', 'Daddy Yankee', 'J Balvin', 'Karol G', 'Ozuna', 'Feid', 'Rauw Alejandro', 'Nicky Jam'],
  },
  {
    id: 'trap-argentino',
    name: 'Trap argentino',
    emoji: '🎤',
    query: 'trap argentino',
    artists: ['Duki', 'Nicki Nicole', 'Trueno', 'Paulo Londra', 'Tiago PZK', 'LIT killah', 'YSY A', 'Khea'],
  },
  {
    id: 'cumbia',
    name: 'Cumbia',
    emoji: '💃',
    query: 'cumbia',
    artists: ['Los Palmeras', 'Damas Gratis', 'Gilda', 'Ráfaga', 'Los Ángeles Azules', 'Antonio Ríos', 'Los Pibes Chorros', 'Mala Fama'],
  },
  {
    id: 'cuarteto',
    name: 'Cuarteto',
    emoji: '🥁',
    query: 'cuarteto',
    artists: ['La Mona Jiménez', 'Rodrigo', 'Ulises Bueno', "Q' Lokura", "La K'onga", 'Jean Carlos', 'Damián Córdoba', 'Luck Ra'],
  },
  {
    id: 'hip-hop',
    name: 'Hip hop',
    emoji: '🎧',
    query: 'hip hop',
    artists: ['Eminem', 'Kendrick Lamar', 'Drake', 'Kanye West', 'Travis Scott', '50 Cent', 'JAY-Z', 'J. Cole'],
  },
  {
    id: 'electronica',
    name: 'Electrónica',
    emoji: '⚡',
    query: 'edm',
    artists: ['David Guetta', 'Avicii', 'Calvin Harris', 'Daft Punk', 'Martin Garrix', 'Swedish House Mafia', 'Tiësto', 'Kygo'],
  },
  {
    id: 'metal',
    name: 'Metal',
    emoji: '🤘',
    query: 'metal',
    artists: ['Metallica', 'Iron Maiden', 'Black Sabbath', 'Slipknot', 'System Of A Down', 'Megadeth', 'Pantera', 'Rammstein'],
  },
  {
    id: 'indie',
    name: 'Indie',
    emoji: '🌙',
    query: 'indie',
    artists: ['Arctic Monkeys', 'The Strokes', 'Tame Impala', 'The Killers', 'Franz Ferdinand', 'Arcade Fire', 'Florence + The Machine', 'Vampire Weekend'],
  },
  {
    id: 'rnb',
    name: 'R&B',
    emoji: '💜',
    query: 'r&b',
    artists: ['Beyoncé', 'Usher', 'Rihanna', 'Frank Ocean', 'SZA', 'Alicia Keys', 'Chris Brown', 'Mariah Carey'],
  },
];
