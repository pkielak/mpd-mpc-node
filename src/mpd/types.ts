/**
 * Types for MPD (Music Player Daemon) client
 */

export interface MpdSong {
  file: string;
  artist?: string;
  album?: string;
  title?: string;
  track?: string;
  duration?: number;
  pos?: number;
  id?: number;
  time?: string;
}

export interface MpdStatus {
  volume: number;
  repeat: boolean;
  random: boolean;
  single: boolean;
  consume: boolean;
  playlist: number;
  playlistlength: number;
  mixrampdb: number;
  state: 'play' | 'stop' | 'pause';
  song?: number;
  songid?: number;
  time?: string;
  elapsed?: number;
  bitrate?: number;
  duration?: number;
  audio?: string;
  nextsong?: number;
  nextsongid?: number;
}

export interface MpdStats {
  artists: number;
  albums: number;
  songs: number;
  uptime: number;
  db_playtime: number;
  db_update: number;
  playtime: number;
}

export interface MpdClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Playback control
  play(position?: number): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(songPosition: number, timePosition: number): Promise<void>;

  // Volume control
  setVolume(volume: number): Promise<void>;

  // Playback options
  setRepeat(repeat: boolean): Promise<void>;
  setRandom(random: boolean): Promise<void>;
  setSingle(single: boolean): Promise<void>;
  setConsume(consume: boolean): Promise<void>;

  // Current state
  status(): Promise<MpdStatus>;
  currentSong(): Promise<MpdSong | null>;
  stats(): Promise<MpdStats>;

  // Playlist management
  playlistInfo(): Promise<MpdSong[]>;
  playlistAdd(uri: string): Promise<void>;
  playlistDelete(position: number): Promise<void>;
  playlistClear(): Promise<void>;

  // Database
  listAllInfo(path?: string): Promise<MpdSong[]>;
  search(type: string, query: string): Promise<MpdSong[]>;
  find(type: string, query: string): Promise<MpdSong[]>;
  listPlaylists(): Promise<{ playlist: string; lastModified: string }[]>;
}
