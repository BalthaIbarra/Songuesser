// Tipos mínimos del Spotify Web Playback SDK (solo lo que usamos).

declare namespace Spotify {
  interface Error {
    message: string;
  }

  interface SdkTrack {
    id: string | null;
    uri: string;
    name: string;
    linked_from?: { uri: string | null; id: string | null };
  }

  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: { current_track: SdkTrack };
  }

  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }

  type ErrorEvent =
    | 'initialization_error'
    | 'authentication_error'
    | 'account_error'
    | 'playback_error';

  class Player {
    constructor(options: PlayerInit);
    connect(): Promise<boolean>;
    disconnect(): void;
    activateElement(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getCurrentState(): Promise<PlaybackState | null>;
    addListener(event: 'ready' | 'not_ready', cb: (d: { device_id: string }) => void): boolean;
    addListener(event: 'player_state_changed', cb: (s: PlaybackState | null) => void): boolean;
    addListener(event: ErrorEvent, cb: (e: Error) => void): boolean;
    removeListener(event: string, cb?: (...args: never[]) => void): boolean;
  }
}

interface Window {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: typeof Spotify;
}
