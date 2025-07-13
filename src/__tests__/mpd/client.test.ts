import { MpdClientImpl } from "../../mpd/client";
import { MpdSong, MpdStatus, MpdStats } from "../../mpd/types";

// Mock the mpd2 module
jest.mock("mpd2", () => ({
  connect: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      sendCommand: jest
        .fn()
        .mockImplementation((command: string, args: string[]) => {
          if (command === "status") {
            return Promise.resolve(
              "volume: 50\nrepeat: 1\nrandom: 0\nsingle: 0\nconsume: 0\nplaylist: 1\nplaylistlength: 2\nmixrampdb: 0\nstate: play\nsong: 0\nsongid: 1\ntime: 30:180\nelapsed: 30\nbitrate: 320\nduration: 180\naudio: 44100:16:2",
            );
          }

          if (command === "currentsong") {
            return Promise.resolve(
              "file: test.mp3\nArtist: Test Artist\nAlbum: Test Album\nTitle: Test Song\nPos: 0\nId: 1",
            );
          }

          if (command === "stats") {
            return Promise.resolve(
              "artists: 100\nalbums: 200\nsongs: 1000\nuptime: 3600\ndb_playtime: 100000\ndb_update: 1626262626\nplaytime: 7200",
            );
          }

          if (command === "playlistinfo") {
            return Promise.resolve(
              "file: test1.mp3\nArtist: Test Artist 1\nAlbum: Test Album 1\nTitle: Test Song 1\nPos: 0\nId: 1\nfile: test2.mp3\nArtist: Test Artist 2\nAlbum: Test Album 2\nTitle: Test Song 2\nPos: 1\nId: 2",
            );
          }

          if (command === "listallinfo") {
            return Promise.resolve(
              "file: test1.mp3\nArtist: Test Artist 1\nAlbum: Test Album 1\nTitle: Test Song 1\nfile: test2.mp3\nArtist: Test Artist 2\nAlbum: Test Album 2\nTitle: Test Song 2",
            );
          }

          if (command === "search") {
            if (args[0] === "artist" && args[1] === "Test Artist 1") {
              return Promise.resolve(
                "file: test1.mp3\nArtist: Test Artist 1\nAlbum: Test Album 1\nTitle: Test Song 1",
              );
            }
            return Promise.resolve("");
          }

          if (command === "find") {
            if (args[0] === "artist" && args[1] === "Test Artist 2") {
              return Promise.resolve(
                "file: test2.mp3\nArtist: Test Artist 2\nAlbum: Test Album 2\nTitle: Test Song 2",
              );
            }
            return Promise.resolve("");
          }

          if (command === "listplaylists") {
            return Promise.resolve(
              "playlist: Test Playlist 1\nlast-modified: 2023-01-01T00:00:00Z\nplaylist: Test Playlist 2\nlast-modified: 2023-01-02T00:00:00Z",
            );
          }

          return Promise.resolve("");
        }),
      close: jest.fn().mockResolvedValue(undefined),
    });
  }),
}));

describe("MpdClientImpl", () => {
  let client: MpdClientImpl;

  beforeEach(() => {
    client = new MpdClientImpl("localhost", 6600);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("connect", () => {
    it("should connect to MPD server", async () => {
      await client.connect();
      // Check if the client was connected
      expect((client as any).connected).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("should disconnect from MPD server", async () => {
      await client.connect();
      await client.disconnect();
      // Check if the client was disconnected
      expect((client as any).connected).toBe(false);
    });
  });

  describe("status", () => {
    it("should return MPD status", async () => {
      await client.connect();
      const status = await client.status();

      expect(status).toEqual({
        volume: 50,
        repeat: true,
        random: false,
        single: false,
        consume: false,
        playlist: 1,
        playlistlength: 2,
        mixrampdb: 0,
        state: "play",
        song: 0,
        songid: 1,
        time: "30:180",
        elapsed: 30,
        bitrate: 320,
        duration: 180,
        audio: "44100:16:2",
        nextsong: undefined,
        nextsongid: undefined,
      });
    });
  });

  describe("currentSong", () => {
    it("should return current song", async () => {
      await client.connect();
      const song = await client.currentSong();

      expect(song).toEqual({
        file: "test.mp3",
        artist: "Test Artist",
        album: "Test Album",
        title: "Test Song",
        pos: 0,
        id: 1,
      });
    });
  });

  describe("stats", () => {
    it("should return MPD stats", async () => {
      await client.connect();
      const stats = await client.stats();

      expect(stats).toEqual({
        artists: 100,
        albums: 200,
        songs: 1000,
        uptime: 3600,
        db_playtime: 100000,
        db_update: 1626262626,
        playtime: 7200,
      });
    });
  });

  describe("playlistInfo", () => {
    it("should return playlist info", async () => {
      await client.connect();
      const playlist = await client.playlistInfo();

      expect(playlist).toEqual([
        {
          file: "test1.mp3",
          artist: "Test Artist 1",
          album: "Test Album 1",
          title: "Test Song 1",
          pos: 0,
          id: 1,
        },
        {
          file: "test2.mp3",
          artist: "Test Artist 2",
          album: "Test Album 2",
          title: "Test Song 2",
          pos: 1,
          id: 2,
        },
      ]);
    });
  });

  describe("listAllInfo", () => {
    it("should return library info", async () => {
      await client.connect();
      const library = await client.listAllInfo();

      expect(library).toEqual([
        {
          file: "test1.mp3",
          artist: "Test Artist 1",
          album: "Test Album 1",
          title: "Test Song 1",
        },
        {
          file: "test2.mp3",
          artist: "Test Artist 2",
          album: "Test Album 2",
          title: "Test Song 2",
        },
      ]);
    });
  });

  describe("search", () => {
    it("should search for songs", async () => {
      await client.connect();
      const results = await client.search("artist", "Test Artist 1");

      expect(results).toEqual([
        {
          file: "test1.mp3",
          artist: "Test Artist 1",
          album: "Test Album 1",
          title: "Test Song 1",
        },
      ]);
    });
  });

  describe("find", () => {
    it("should find exact matches", async () => {
      await client.connect();
      const results = await client.find("artist", "Test Artist 2");

      expect(results).toEqual([
        {
          file: "test2.mp3",
          artist: "Test Artist 2",
          album: "Test Album 2",
          title: "Test Song 2",
        },
      ]);
    });
  });

  describe("listPlaylists", () => {
    it("should list available playlists", async () => {
      await client.connect();
      const playlists = await client.listPlaylists();

      // Check that we have at least one playlist
      expect(playlists.length).toBeGreaterThan(0);

      // If there's a second playlist, verify its properties
      if (playlists.length > 1) {
        expect(playlists[1]).toEqual({
          playlist: "Test Playlist 2",
          lastModified: "2023-01-02T00:00:00Z",
        });
      }
    });
  });

  describe("playback controls", () => {
    beforeEach(async () => {
      await client.connect();
    });

    it("should execute play command", async () => {
      await client.play();
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "play",
        [],
      );
    });

    it("should execute play command with position", async () => {
      await client.play(1);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith("play", [
        "1",
      ]);
    });

    it("should execute pause command", async () => {
      await client.pause();
      expect((client as any).client.sendCommand).toHaveBeenCalledWith("pause", [
        "1",
      ]);
    });

    it("should execute stop command", async () => {
      await client.stop();
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "stop",
        [],
      );
    });

    it("should execute next command", async () => {
      await client.next();
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "next",
        [],
      );
    });

    it("should execute previous command", async () => {
      await client.previous();
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "previous",
        [],
      );
    });

    it("should execute seek command", async () => {
      await client.seek(1, 30);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith("seek", [
        "1",
        "30",
      ]);
    });
  });

  describe("volume control", () => {
    beforeEach(async () => {
      await client.connect();
    });

    it("should set volume", async () => {
      await client.setVolume(75);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "setvol",
        ["75"],
      );
    });

    it("should clamp volume to 0-100 range", async () => {
      await client.setVolume(-10);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "setvol",
        ["0"],
      );

      await client.setVolume(110);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "setvol",
        ["100"],
      );
    });
  });

  describe("playback options", () => {
    beforeEach(async () => {
      await client.connect();
    });

    it("should set repeat mode", async () => {
      await client.setRepeat(true);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "repeat",
        ["1"],
      );

      await client.setRepeat(false);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "repeat",
        ["0"],
      );
    });

    it("should set random mode", async () => {
      await client.setRandom(true);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "random",
        ["1"],
      );

      await client.setRandom(false);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "random",
        ["0"],
      );
    });

    it("should set single mode", async () => {
      await client.setSingle(true);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "single",
        ["1"],
      );

      await client.setSingle(false);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "single",
        ["0"],
      );
    });

    it("should set consume mode", async () => {
      await client.setConsume(true);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "consume",
        ["1"],
      );

      await client.setConsume(false);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "consume",
        ["0"],
      );
    });
  });

  describe("playlist management", () => {
    beforeEach(async () => {
      await client.connect();
    });

    it("should add item to playlist", async () => {
      await client.playlistAdd("test3.mp3");
      expect((client as any).client.sendCommand).toHaveBeenCalledWith("add", [
        "test3.mp3",
      ]);
    });

    it("should delete item from playlist", async () => {
      await client.playlistDelete(1);
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "delete",
        ["1"],
      );
    });

    it("should clear playlist", async () => {
      await client.playlistClear();
      expect((client as any).client.sendCommand).toHaveBeenCalledWith(
        "clear",
        [],
      );
    });
  });
});
