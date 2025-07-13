import { MpdClient, MpdSong, MpdStatus, MpdStats } from '../../mpd/types';

/**
 * Mock implementation of MpdClient for testing
 */
export class MockMpdClient implements MpdClient {
  connected: boolean = false;
  mockStatus: MpdStatus = {
    volume: 50,
    repeat: false,
    random: false,
    single: false,
    consume: false,
    playlist: 1,
    playlistlength: 2,
    mixrampdb: 0,
    state: 'stop',
  };

  mockCurrentSong: MpdSong | null = {
    file: 'test.mp3',
    artist: 'Test Artist',
    album: 'Test Album',
    title: 'Test Song',
  };

  mockPlaylist: MpdSong[] = [
    {
      file: 'test1.mp3',
      artist: 'Test Artist 1',
      album: 'Test Album 1',
      title: 'Test Song 1',
      pos: 0,
      id: 1,
    },
    {
      file: 'test2.mp3',
      artist: 'Test Artist 2',
      album: 'Test Album 2',
      title: 'Test Song 2',
      pos: 1,
      id: 2,
    },
  ];

  mockLibrary: MpdSong[] = [
    ...this.mockPlaylist,
    {
      file: 'test3.mp3',
      artist: 'Test Artist 3',
      album: 'Test Album 3',
      title: 'Test Song 3',
    },
  ];

  mockStats: MpdStats = {
    artists: 3,
    albums: 3,
    songs: 3,
    uptime: 1000,
    db_playtime: 500,
    db_update: 1626262626,
    playtime: 200,
  };

  connect = jest.fn().mockImplementation(async (): Promise<void> => {
    this.connected = true;
    return Promise.resolve();
  });

  disconnect = jest.fn().mockImplementation(async (): Promise<void> => {
    this.connected = false;
    return Promise.resolve();
  });

  play = jest.fn().mockImplementation(async (): Promise<void> => {
    this.mockStatus.state = 'play';
    return Promise.resolve();
  });

  pause = jest.fn().mockImplementation(async (): Promise<void> => {
    this.mockStatus.state = 'pause';
    return Promise.resolve();
  });

  stop = jest.fn().mockImplementation(async (): Promise<void> => {
    this.mockStatus.state = 'stop';
    return Promise.resolve();
  });

  next = jest.fn().mockResolvedValue(undefined);
  previous = jest.fn().mockResolvedValue(undefined);
  seek = jest.fn().mockResolvedValue(undefined);

  setVolume = jest.fn().mockImplementation(async (volume: number): Promise<void> => {
    this.mockStatus.volume = volume;
    return Promise.resolve();
  });

  setRepeat = jest.fn().mockImplementation(async (repeat: boolean): Promise<void> => {
    this.mockStatus.repeat = repeat;
    return Promise.resolve();
  });

  setRandom = jest.fn().mockImplementation(async (random: boolean): Promise<void> => {
    this.mockStatus.random = random;
    return Promise.resolve();
  });

  setSingle = jest.fn().mockImplementation(async (single: boolean): Promise<void> => {
    this.mockStatus.single = single;
    return Promise.resolve();
  });

  setConsume = jest.fn().mockImplementation(async (consume: boolean): Promise<void> => {
    this.mockStatus.consume = consume;
    return Promise.resolve();
  });

  status = jest.fn().mockImplementation(async (): Promise<MpdStatus> => {
    return Promise.resolve(this.mockStatus);
  });

  currentSong = jest.fn().mockImplementation(async (): Promise<MpdSong | null> => {
    return Promise.resolve(this.mockCurrentSong);
  });

  stats = jest.fn().mockImplementation(async (): Promise<MpdStats> => {
    return Promise.resolve(this.mockStats);
  });

  playlistInfo = jest.fn().mockImplementation(async (): Promise<MpdSong[]> => {
    return Promise.resolve(this.mockPlaylist);
  });

  playlistAdd = jest.fn().mockImplementation(async (uri: string): Promise<void> => {
    const newSong: MpdSong = {
      file: uri,
      pos: this.mockPlaylist.length,
      id: this.mockPlaylist.length + 1,
    };
    this.mockPlaylist.push(newSong);
    this.mockStatus.playlistlength = this.mockPlaylist.length;
    return Promise.resolve();
  });

  playlistDelete = jest.fn().mockImplementation(async (position: number): Promise<void> => {
    if (position >= 0 && position < this.mockPlaylist.length) {
      this.mockPlaylist.splice(position, 1);
      this.mockStatus.playlistlength = this.mockPlaylist.length;
    }
    return Promise.resolve();
  });

  playlistClear = jest.fn().mockImplementation(async (): Promise<void> => {
    this.mockPlaylist = [];
    this.mockStatus.playlistlength = 0;
    return Promise.resolve();
  });

  listAllInfo = jest.fn().mockImplementation(async (): Promise<MpdSong[]> => {
    return Promise.resolve(this.mockLibrary);
  });

  search = jest.fn().mockImplementation(async (type: string, query: string): Promise<MpdSong[]> => {
    if (type === 'any') {
      return Promise.resolve(
        this.mockLibrary.filter(
          (song) =>
            (song.artist && song.artist.includes(query)) ||
            (song.album && song.album.includes(query)) ||
            (song.title && song.title.includes(query)) ||
            song.file.includes(query)
        )
      );
    }

    return Promise.resolve(
      this.mockLibrary.filter((song) => {
        const value = song[type as keyof MpdSong];
        return typeof value === 'string' && value.includes(query);
      })
    );
  });

  find = jest.fn().mockImplementation(async (type: string, query: string): Promise<MpdSong[]> => {
    return Promise.resolve(
      this.mockLibrary.filter((song) => {
        const value = song[type as keyof MpdSong];
        return typeof value === 'string' && value === query;
      })
    );
  });

  listPlaylists = jest.fn().mockImplementation(
    async (): Promise<{ playlist: string; lastModified: string }[]> => {
      return Promise.resolve([
        { playlist: 'Test Playlist 1', lastModified: '2023-01-01T00:00:00Z' },
        { playlist: 'Test Playlist 2', lastModified: '2023-01-02T00:00:00Z' },
      ]);
    }
  );
}
