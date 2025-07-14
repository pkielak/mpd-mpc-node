import { MpdClient, MpdSong, MpdStatus, MpdStats } from "./types";
import MPD from "mpd2";

export class MpdClientImpl implements MpdClient {
  private client: any;
  private host: string;
  private port: number;
  private connected: boolean = false;

  constructor(host: string = "localhost", port: number = 6600) {
    this.host = host;
    this.port = port;
  }

  /**
   * Connect to the MPD server
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.client = await MPD.connect({
        host: this.host,
        port: this.port,
      });
      this.connected = true;
    } catch (err) {
      this.connected = false;
      throw err;
    }
  }

  /**
   * Disconnect from the MPD server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      if (this.client && typeof this.client.close === "function") {
        await this.client.close();
      }
      this.connected = false;
    } catch (err) {
      console.error("Error disconnecting from MPD:", err);
    }
  }

  /**
   * Execute an MPD command
   */
  private async cmd(command: string, args: string[] = []): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error("Not connected to MPD server");
    }

    try {
      const result = await this.client.sendCommand(command, args);
      return result;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Parse MPD response to an object
   */
  private parseResponse(data: string): any {
    const lines = data.split("\n");
    const result: Record<string, any> = {};

    for (const line of lines) {
      const matches = line.match(/^([^:]+):\s(.+)$/);
      if (matches) {
        const [, key, value] = matches;
        result[key.toLowerCase()] = value;
      }
    }

    return result;
  }

  /**
   * Parse MPD response to an array of objects
   */
  private parseArrayResponse(data: string): any[] {
    const lines = data.split("\n");
    const result: Record<string, any>[] = [];
    let current: Record<string, any> = {};

    for (const line of lines) {
      const matches = line.match(/^([^:]+):\s(.+)$/);
      if (matches) {
        const [, key, value] = matches;
        const lcKey = key.toLowerCase();

        // If we encounter a 'file' key and our current object isn't empty,
        // push the current object to the result and start a new one
        if (lcKey === "file" && Object.keys(current).length > 0) {
          result.push(current);
          current = {};
        }

        current[lcKey] = value;
      }
    }

    // Add the last object if it's not empty
    if (Object.keys(current).length > 0) {
      result.push(current);
    }

    return result;
  }

  // Playback control
  async play(position?: number): Promise<void> {
    await this.cmd("play", position !== undefined ? [position.toString()] : []);
  }

  async pause(): Promise<void> {
    await this.cmd("pause", ["1"]);
  }

  async stop(): Promise<void> {
    await this.cmd("stop");
  }

  async next(): Promise<void> {
    await this.cmd("next");
  }

  async previous(): Promise<void> {
    await this.cmd("previous");
  }

  async seek(songPosition: number, timePosition: number): Promise<void> {
    await this.cmd("seek", [songPosition.toString(), timePosition.toString()]);
  }

  // Volume control
  async setVolume(volume: number): Promise<void> {
    const vol = Math.max(0, Math.min(100, Math.floor(volume)));
    await this.cmd("setvol", [vol.toString()]);
  }

  // Playback options
  async setRepeat(repeat: boolean): Promise<void> {
    await this.cmd("repeat", [repeat ? "1" : "0"]);
  }

  async setRandom(random: boolean): Promise<void> {
    await this.cmd("random", [random ? "1" : "0"]);
  }

  async setSingle(single: boolean): Promise<void> {
    await this.cmd("single", [single ? "1" : "0"]);
  }

  async setConsume(consume: boolean): Promise<void> {
    await this.cmd("consume", [consume ? "1" : "0"]);
  }

  // Current state
  async status(): Promise<MpdStatus> {
    const response = await this.cmd("status");
    const parsed = this.parseResponse(response);

    return {
      volume: parseInt(parsed.volume, 10),
      repeat: parsed.repeat === "1",
      random: parsed.random === "1",
      single: parsed.single === "1",
      consume: parsed.consume === "1",
      playlist: parseInt(parsed.playlist, 10),
      playlistlength: parseInt(parsed.playlistlength, 10),
      mixrampdb: parseFloat(parsed.mixrampdb),
      state: parsed.state as "play" | "stop" | "pause",
      song: parsed.song !== undefined ? parseInt(parsed.song, 10) : undefined,
      songid:
        parsed.songid !== undefined ? parseInt(parsed.songid, 10) : undefined,
      time: parsed.time,
      elapsed:
        parsed.elapsed !== undefined ? parseFloat(parsed.elapsed) : undefined,
      bitrate:
        parsed.bitrate !== undefined ? parseInt(parsed.bitrate, 10) : undefined,
      duration:
        parsed.duration !== undefined ? parseFloat(parsed.duration) : undefined,
      audio: parsed.audio,
      nextsong:
        parsed.nextsong !== undefined
          ? parseInt(parsed.nextsong, 10)
          : undefined,
      nextsongid:
        parsed.nextsongid !== undefined
          ? parseInt(parsed.nextsongid, 10)
          : undefined,
    };
  }

  async currentSong(): Promise<MpdSong | null> {
    const response = await this.cmd("currentsong");
    if (!response) return null;

    const parsed = this.parseResponse(response);
    if (Object.keys(parsed).length === 0) return null;

    return this.convertToMpdSong(parsed);
  }

  async stats(): Promise<MpdStats> {
    const response = await this.cmd("stats");
    const parsed = this.parseResponse(response);

    return {
      artists: parseInt(parsed.artists, 10),
      albums: parseInt(parsed.albums, 10),
      songs: parseInt(parsed.songs, 10),
      uptime: parseInt(parsed.uptime, 10),
      db_playtime: parseInt(parsed.db_playtime, 10),
      db_update: parseInt(parsed.db_update, 10),
      playtime: parseInt(parsed.playtime, 10),
    };
  }

  // Playlist management
  async playlistInfo(): Promise<MpdSong[]> {
    const response = await this.cmd("playlistinfo");
    const parsed = this.parseArrayResponse(response);

    return parsed.map((item) => this.convertToMpdSong(item));
  }

  async playlistAdd(uri: string): Promise<void> {
    // MPD protocol expects a single string for the add command
    // Try both approaches to ensure compatibility
    try {
      // First try the array approach
      await this.cmd("add", [uri]);
    } catch (error) {
      console.error(`Error with array approach: ${error}`);
      try {
        // Fall back to direct string command if array approach fails
        await this.client.sendCommand(`add "${uri.replace(/"/g, '\\"')}"`);
      } catch (fallbackError) {
        console.error(`Error with fallback approach: ${fallbackError}`);
        throw error; // Throw the original error if both methods fail
      }
    }
  }

  async playlistDelete(position: number): Promise<void> {
    await this.cmd("delete", [position.toString()]);
  }

  async playlistClear(): Promise<void> {
    await this.cmd("clear");
  }

  // Database
  async listAllInfo(path: string = ""): Promise<MpdSong[]> {
    const response = await this.cmd("listallinfo", path ? [path] : []);
    const parsed = this.parseArrayResponse(response);

    return parsed
      .filter((item) => item.file) // Only return items that have a file attribute
      .map((item) => this.convertToMpdSong(item));
  }

  async search(type: string, query: string): Promise<MpdSong[]> {
    // Debug the search parameters
    console.error(`Searching for ${type}: "${query}"`);

    // Process the query to be more search-friendly
    const processedQuery = this.processSearchQuery(query);
    console.error(`Processed query: "${processedQuery}"`);

    // Try a series of search approaches to maximize chances of finding results
    try {
      // First try: standard string command approach
      const command = `search "${type}" "${processedQuery.replace(/"/g, '\\"')}"`;
      console.error(`Search command: ${command}`);
      const response = await this.client.sendCommand(command);
      const parsed = this.parseArrayResponse(response);
      const results = parsed.map((item) => this.convertToMpdSong(item));

      if (results.length > 0) {
        return results;
      }

      // Second try: if no results and it's a title search, remove parentheses content
      if (type === "title" && processedQuery !== query && query.includes("(")) {
        const simplifiedQuery = query.split("(")[0].trim();
        console.error(
          `No results, trying simplified title: "${simplifiedQuery}"`,
        );
        const fallbackCommand = `search "${type}" "${simplifiedQuery.replace(/"/g, '\\"')}"`;
        const fallbackResponse = await this.client.sendCommand(fallbackCommand);
        const fallbackParsed = this.parseArrayResponse(fallbackResponse);
        const fallbackResults = fallbackParsed.map((item) =>
          this.convertToMpdSong(item),
        );

        if (fallbackResults.length > 0) {
          return fallbackResults;
        }
      }

      // Third try: array approach as fallback
      console.error(`Trying array approach`);
      const arrayResponse = await this.cmd("search", [type, processedQuery]);
      const arrayParsed = this.parseArrayResponse(arrayResponse);
      return arrayParsed.map((item) => this.convertToMpdSong(item));
    } catch (error) {
      console.error(`MPD search error:`, error);

      // Last resort: try with any field if we were searching for a specific field
      if (type !== "any") {
        try {
          console.error(`Trying 'any' field search as last resort`);
          return await this.search("any", query);
        } catch (anyError) {
          console.error(`Even 'any' field search failed:`, anyError);
        }
      }

      // If nothing worked, return empty results instead of error
      console.error(`All search attempts failed, returning empty results`);
      return [];
    }
  }

  /**
   * Process a search query to make it more search-friendly
   */
  private processSearchQuery(query: string): string {
    // If query looks like a formatted result (Artist - Title (Album)),
    // extract just the title part
    if (query.includes(" - ") && query.includes("(")) {
      const titlePart = query.split(" - ")[1]?.split(" (")[0];
      if (titlePart) {
        return titlePart.trim();
      }
    }
    return query;
  }

  async find(type: string, query: string): Promise<MpdSong[]> {
    const response = await this.cmd("find", [type, query]);
    const parsed = this.parseArrayResponse(response);

    return parsed.map((item) => this.convertToMpdSong(item));
  }

  async listPlaylists(): Promise<{ playlist: string; lastModified: string }[]> {
    const response = await this.cmd("listplaylists");
    const parsed = this.parseArrayResponse(response);

    return parsed.map((item) => ({
      playlist: item.playlist,
      lastModified: item["last-modified"],
    }));
  }

  private convertToMpdSong(data: Record<string, any>): MpdSong {
    return {
      file: data.file,
      artist: data.artist,
      album: data.album,
      title: data.title,
      track: data.track,
      duration:
        data.duration !== undefined ? parseFloat(data.duration) : undefined,
      pos: data.pos !== undefined ? parseInt(data.pos, 10) : undefined,
      id: data.id !== undefined ? parseInt(data.id, 10) : undefined,
      time: data.time,
    };
  }
}
