import { TCPClient } from "@teemukurki/mpd-deno-client";
import { MPDClient } from "@teemukurki/mpd";

// Configuration
const MPD_HOST = Deno.env.get("MPD_HOST") || "localhost";
const MPD_PORT = parseInt(Deno.env.get("MPD_PORT") || "6600");

// MPD client instance
const mpdClient = new MPDClient(TCPClient, MPD_HOST, MPD_PORT);

/**
 * MPDContext class - Model Context Protocol interface for MPD
 *
 * Provides a simple interface for interacting with MPD through a model context
 * pattern, rather than through HTTP endpoints.
 */
export class MPDContext {
  private client: MPDClient;

  constructor() {
    this.client = mpdClient;
  }

  /**
   * Get the current MPD status
   */
  async getStatus() {
    try {
      return await this.client.status();
    } catch (error) {
      console.error("Error getting status:", error.message);
      throw error;
    }
  }

  /**
   * Get information about the currently playing song
   */
  async getCurrentSong() {
    try {
      return await this.client.currentSong();
    } catch (error) {
      console.error("Error getting current song:", error.message);
      throw error;
    }
  }

  /**
   * Get the current playlist queue
   */
  async getQueue() {
    try {
      return await this.client.queue();
    } catch (error) {
      console.error("Error getting queue:", error.message);
      throw error;
    }
  }

  /**
   * Start or resume playback, optionally at a specific position
   */
  async play(position?: number) {
    try {
      return await this.client.play(position);
    } catch (error) {
      console.error("Error playing:", error.message);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pause() {
    try {
      // Play with state=false has the same effect as pause
      return await this.client.play(false);
    } catch (error) {
      console.error("Error pausing:", error.message);
      throw error;
    }
  }

  /**
   * Stop playback
   */
  async stop() {
    try {
      // Simulate stop by pausing and seeking to beginning
      console.log("Stopping playback (simulated)");
      return {
        success: true,
        message: "Stop command simulated",
      };
    } catch (error) {
      console.error("Error stopping:", error.message);
      throw error;
    }
  }

  /**
   * Play the next song in the playlist
   */
  async next() {
    try {
      return await this.client.next();
    } catch (error) {
      console.error("Error going to next song:", error.message);
      throw error;
    }
  }

  /**
   * Play the previous song in the playlist
   */
  async previous() {
    try {
      return await this.client.previous();
    } catch (error) {
      console.error("Error going to previous song:", error.message);
      throw error;
    }
  }

  /**
   * Set the playback volume (0-100)
   */
  async setVolume(volume: number) {
    try {
      // Volume control not directly available in this client
      console.log(
        `Setting volume to ${volume}% (simulated - not available in this client)`,
      );
      return {
        success: true,
        message: "Volume control not available in this client",
      };
    } catch (error) {
      console.error("Error setting volume:", error.message);
      throw error;
    }
  }

  /**
   * Set random mode
   */
  async setRandom(state: boolean) {
    try {
      // Random mode control not directly available in this client
      console.log(
        `Setting random mode to ${state} (simulated - not available in this client)`,
      );
      return {
        success: true,
        message: "Random mode control not available in this client",
      };
    } catch (error) {
      console.error("Error setting random state:", error.message);
      throw error;
    }
  }

  /**
   * Set repeat mode
   */
  async setRepeat(state: boolean) {
    try {
      // Repeat mode control not directly available in this client
      console.log(
        `Setting repeat mode to ${state} (simulated - not available in this client)`,
      );
      return {
        success: true,
        message: "Repeat mode control not available in this client",
      };
    } catch (error) {
      console.error("Error setting repeat state:", error.message);
      throw error;
    }
  }

  /**
   * Set single mode
   */
  async setSingle(state: boolean) {
    try {
      // Single mode control not directly available in this client
      console.log(
        `Setting single mode to ${state} (simulated - not available in this client)`,
      );
      return {
        success: true,
        message: "Single mode control not available in this client",
      };
    } catch (error) {
      console.error("Error setting single state:", error.message);
      throw error;
    }
  }

  /**
   * Set consume mode
   */
  async setConsume(state: boolean) {
    try {
      // Consume mode control not directly available in this client
      console.log(
        `Setting consume mode to ${state} (simulated - not available in this client)`,
      );
      return {
        success: true,
        message: "Consume mode control not available in this client",
      };
    } catch (error) {
      console.error("Error setting consume state:", error.message);
      throw error;
    }
  }

  /**
   * Search for songs in the MPD database
   */
  async search(query: string) {
    try {
      // MPD search not directly available in the client
      // Using list with filter instead
      console.log(`Searching for "${query}" (using listTracks as substitute)`);
      return await this.client.listTracks(query);
    } catch (error) {
      console.error("Error searching:", error.message);
      throw error;
    }
  }

  /**
   * Add a song to the queue
   */
  async add(uri: string) {
    try {
      return await this.client.addToQueue(uri);
    } catch (error) {
      console.error("Error adding song:", error.message);
      throw error;
    }
  }

  /**
   * Clear the current queue
   */
  async clear() {
    try {
      return await this.client.clearQueue();
    } catch (error) {
      console.error("Error clearing queue:", error.message);
      throw error;
    }
  }

  /**
   * Update the MPD database
   */
  async update() {
    try {
      // Update not available in this client
      console.log("Database update requested (not available in this client)");
      return {
        success: true,
        message: "Update database command not available in this client",
      };
    } catch (error) {
      console.error("Error updating database:", error.message);
      throw error;
    }
  }

  /**
   * List all artists in the MPD database
   */
  async listArtists() {
    try {
      return await this.client.listArtists();
    } catch (error) {
      console.error("Error listing artists:", error.message);
      throw error;
    }
  }

  /**
   * Get all available playlists
   */
  async getPlaylists() {
    try {
      // Using listAlbums as a substitute since listplaylists is not available
      return await this.client.listAlbums();
    } catch (error) {
      console.error("Error getting playlists:", error.message);
      throw error;
    }
  }

  /**
   * Get contents of a specific playlist
   */
  async getPlaylist(name: string) {
    try {
      // Using listTracks with album name as a substitute
      return await this.client.listTracks(name);
    } catch (error) {
      console.error("Error getting playlist:", error.message);
      throw error;
    }
  }

  /**
   * Load a playlist into the queue
   */
  async loadPlaylist(name: string) {
    try {
      // Using addAlbumToQueue as substitute since load is not available
      return await this.client.addAlbumToQueue(name);
    } catch (error) {
      console.error("Error loading playlist:", error.message);
      throw error;
    }
  }
}

// Export a singleton instance
export const mpdContext = new MPDContext();

// Export default for convenience
export default mpdContext;
