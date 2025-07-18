#!/usr/bin/env node

/**
 * Music Player Daemon (MPD) MCP Server
 *
 * This server implements the Model Context Protocol to provide LLM access to MPD,
 * allowing control of music playback, playlist management, and music library browsing.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MpdClientImpl } from "./mpd/client";
import { MpdSong, MpdStatus, MpdStats } from "./mpd/types";

// Configuration
const MPD_HOST = process.env.MPD_HOST || "localhost";
const MPD_PORT = parseInt(process.env.MPD_PORT || "6600", 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3000", 10);

// Initialize MPD client but don't connect immediately
const mpdClient = new MpdClientImpl(MPD_HOST, MPD_PORT);

/**
 * Create an MCP server with capabilities for resources and tools
 */
const server = new Server(
  {
    name: "mpd-mpc-server",
    version: "1.0.0",
    description: "Music Player Daemon (MPD) MCP Server",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

/**
 * Handler for listing available MPD resources.
 * Exposes status, current song, playlist, library and stats as resources.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "mpd://status",
        mimeType: "application/json",
        name: "MPD Status",
        description:
          "Current MPD playback status including volume, repeat/shuffle settings, and what's playing",
      },
      {
        uri: "mpd://current-song",
        mimeType: "application/json",
        name: "Current Song",
        description:
          "Information about the currently playing song (artist, title, album)",
      },
      {
        uri: "mpd://playlist",
        mimeType: "application/json",
        name: "Playlist",
        description:
          "Current MPD playlist contents - all songs queued for playback",
      },
      {
        uri: "mpd://stats",
        mimeType: "application/json",
        name: "MPD Stats",
        description:
          "Statistics about the MPD server and music library (number of songs, artists, etc.)",
      },
      {
        uri: "mpd://library",
        mimeType: "application/json",
        name: "Music Library",
        description:
          "Complete listing of available music in the MPD library (all songs)",
      },
    ],
  };
});

/**
 * Handler for reading MPD resources.
 * Returns appropriate MPD data based on the requested URI.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    await ensureConnected();

    const url = new URL(request.params.uri);
    const resource = url.hostname;

    try {
      let data: any;
      let text: string;

      switch (resource) {
        case "status":
          data = await mpdClient.status();
          text = JSON.stringify(data, null, 2);
          break;

        case "current-song":
          data = await mpdClient.currentSong();
          text = JSON.stringify(
            data || { message: "No song playing" },
            null,
            2,
          );
          break;

        case "playlist":
          data = await mpdClient.playlistInfo();
          text = JSON.stringify(data, null, 2);
          break;

        case "stats":
          data = await mpdClient.stats();
          text = JSON.stringify(data, null, 2);
          break;

        case "library":
          data = await mpdClient.listAllInfo();
          text = JSON.stringify(data, null, 2);
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Error reading resource ${resource}: ${(error as Error).message}`,
      );
    }
  } catch (error) {
    console.error("Error in ReadResourceRequestSchema handler:", error);
    throw error;
  }
});

/**
 * Handler that lists available MPD tools.
 * Exposes tools for playback control, volume control, search, playlist management, etc.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "help",
        description:
          "Get help on how to use the music player and available commands",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description:
                "Optional topic to get help on (e.g., 'search', 'playback', 'playlist')",
            },
          },
        },
      },
      {
        name: "resume",
        description: "Resume or start playing music from the current playlist",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "pause",
        description: "Pause the music that is currently playing",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "next",
        description: "Skip to the next song in your playlist",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "player",
        description:
          "Advanced music player controls - play, stop, or navigate to previous tracks",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["resume", "pause", "stop", "next", "previous"],
              description: "Which action to perform on the music player",
            },
            position: {
              type: "number",
              description: "Optional song position number for resume action",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "volume",
        description:
          "Change how loud the music plays (0 is silent, 100 is loudest)",
        inputSchema: {
          type: "object",
          properties: {
            volume: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Volume level from 0 (silent) to 100 (loudest)",
            },
          },
          required: ["volume"],
        },
      },
      {
        name: "search",
        description:
          "Find songs in your music library - search by name, artist, or album",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "What music you want to find - enter any search terms",
            },
            type: {
              type: "string",
              enum: ["artist", "album", "title", "any"],
              description:
                "Optional: Limit search to artist names, album names, or song titles (defaults to 'any')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "play",
        description: "Play a specific song, album, or artist by name",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Name of the song, album, or artist you want to play",
            },
            type: {
              type: "string",
              enum: ["artist", "album", "title", "any"],
              description:
                "Optional: Specify if you're looking for an artist, album, or song title (defaults to 'any')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "playlist",
        description:
          "Add or remove songs from your playlist, or clear the whole list",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["add", "delete", "clear"],
              description:
                "What you want to do with the playlist: add a song, delete a song, or clear all songs",
            },
            uri: {
              type: "string",
              description:
                "Path to the song file you want to add (needed only when adding)",
            },
            position: {
              type: "number",
              description:
                "Position number of the song to remove (needed only when deleting)",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "settings",
        description:
          "Change how music plays - repeat songs, shuffle, play once, or remove after playing",
        inputSchema: {
          type: "object",
          properties: {
            repeat: {
              type: "boolean",
              description:
                "Turn on/off repeat mode (play the playlist over and over)",
            },
            random: {
              type: "boolean",
              description:
                "Turn on/off shuffle mode (play songs in random order)",
            },
            single: {
              type: "boolean",
              description:
                "Turn on/off single mode (play only one song and stop)",
            },
            consume: {
              type: "boolean",
              description:
                "Turn on/off consume mode (remove songs from playlist after playing)",
            },
          },
        },
      },
    ],
  };
});

/**
 * Handler for executing MPD tools.
 * Implements various music playback control functions.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    await ensureConnected();

    switch (request.params.name) {
      case "help": {
        const topic = request.params.arguments?.topic as string | undefined;
        let helpText = "";

        if (!topic) {
          helpText = `# MPD Music Player Help

Welcome to the MPD Music Control Server! Here are the available commands:

## Basic Controls
- \`resume\` - Start playing music
- \`pause\` - Pause the music that is currently playing
- \`next\` - Skip to the next song
- \`play\` - Play a specific artist, album, or song by name (use simple terms)
- \`player\` - Advanced playback control with options

## Searching Music
- \`search\` - Find music by artist, album, title or any field

## Playlist Management
- \`playlist\` - Manage your playlist (add, remove, clear)

## Settings
- \`volume\` - Set the volume level
- \`settings\` - Set repeat, random, single, and consume modes

## Resources
You can also view:
- Current playing song info
- Your playlist
- Library statistics

For more specific help, try \`help\` with a topic like "search", "playback", or "playlist".`;
        } else {
          // Topic-specific help
          switch (topic.toLowerCase()) {
            case "search":
              helpText = `# Music Search Help

Use \`search\` to find music in your library:

Basic search (searches all fields):
- Just provide a query string
- Example: \`{"query": "deftones"}\`

Advanced search (specify field type):
- Optionally specify the type and query
- Types: "artist", "album", "title", "any"
- Example: \`{"type": "artist", "query": "deftones"}\`

Search results will show matching songs that you can then play.`;
              break;

            case "playback":
            case "play":
              helpText = `# Playback Control Help

Basic controls:
- \`resume\` - Start playing music
- \`pause\` - Pause the current track
- \`next\` - Skip to the next track
- \`play\` - Play specific music by name (recommended)
  - Examples:
  - Play artist: \`{"query": "deftones", "type": "artist"}\`
  - Play album: \`{"query": "white pony", "type": "album"}\`
  - Play song: \`{"query": "be quiet", "type": "title"}\`
  - Simple search and play: \`{"query": "deftones"}\`
  - Note: Use simple search terms rather than copying the full formatted result

Advanced control with \`player\`:
- Resume: \`{"action": "resume"}\`
- Resume specific position: \`{"action": "resume", "position": 3}\`
- Pause: \`{"action": "pause"}\`
- Stop: \`{"action": "stop"}\`
- Next: \`{"action": "next"}\`
- Previous: \`{"action": "previous"}\`

Playback options with \`settings\`:
- Repeat mode: \`{"repeat": true}\`
- Random mode: \`{"random": true}\`
- Single mode: \`{"single": true}\`
- Consume mode: \`{"consume": true}\``;
              break;

            case "playlist":
              helpText = `# Playlist Management Help

Use \`playlist\` with these actions:

- Add a song: \`{"action": "add", "uri": "file_path_or_uri"}\`
- Remove a song: \`{"action": "delete", "position": 2}\`
- Clear playlist: \`{"action": "clear"}\`

You can view the current playlist contents through the MPD resources.`;
              break;

            case "volume":
              helpText = `# Volume Control Help

Use \`volume\` to adjust the volume:

\`{"volume": 75}\`

The volume range is 0-100, where:
- 0 is muted
- 100 is maximum volume`;
              break;

            default:
              helpText = `No specific help available for "${topic}". Try general help or one of these topics: "search", "playback", "playlist", "volume".`;
          }
        }

        return {
          content: [{ type: "text", text: helpText }],
        };
      }

      case "resume": {
        try {
          await mpdClient.play();
          const status = await mpdClient.status();
          const currentSong = await mpdClient.currentSong();
          let songInfo = "No song is playing.";

          if (currentSong) {
            songInfo = `Now playing: ${currentSong.artist || "Unknown Artist"} - ${currentSong.title || currentSong.file}`;
            if (currentSong.album) {
              songInfo += ` (${currentSong.album})`;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: `Music playback resumed. ${songInfo}`,
              },
            ],
          };
        } catch (error) {
          throw new Error(`Error resuming music: ${(error as Error).message}`);
        }
      }

      case "pause": {
        try {
          await mpdClient.pause();
          return {
            content: [
              {
                type: "text",
                text: "Music playback paused.",
              },
            ],
          };
        } catch (error) {
          throw new Error(`Error pausing music: ${(error as Error).message}`);
        }
      }

      case "next": {
        try {
          await mpdClient.next();
          const currentSong = await mpdClient.currentSong();
          let songInfo = "No next song available.";

          if (currentSong) {
            songInfo = `Now playing: ${currentSong.artist || "Unknown Artist"} - ${currentSong.title || currentSong.file}`;
            if (currentSong.album) {
              songInfo += ` (${currentSong.album})`;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: `Skipped to next song. ${songInfo}`,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Error skipping to next track: ${(error as Error).message}`,
          );
        }
      }

      case "play": {
        const query = String(request.params.arguments?.query);
        const type = request.params.arguments?.type
          ? String(request.params.arguments.type)
          : "any";

        if (!query) {
          throw new Error("Query is required - specify what you want to play");
        }

        try {
          console.error(`Searching to play: ${type}="${query}"`);

          // First, search for the music using the original query
          let results = await mpdClient.search(type, query);

          // If no results, try a simplified search
          if (results.length === 0) {
            // Extract just the title part if it looks like "Artist - Title (Album)"
            const simplifiedQuery =
              query.split(" - ").pop()?.split(" (")[0] || query;

            if (simplifiedQuery !== query) {
              console.error(
                `No results, trying simplified query: ${simplifiedQuery}`,
              );
              results = await mpdClient.search("title", simplifiedQuery);
            }
          }

          // If still no results, try a more aggressive search
          if (results.length === 0 && query.includes(" - ")) {
            // Try searching by artist
            const artistPart = query.split(" - ")[0].trim();
            console.error(`No results, trying artist search: ${artistPart}`);
            results = await mpdClient.search("artist", artistPart);
          }

          if (results.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Could not find any music matching "${query}". Try a different search term.`,
                },
              ],
            };
          }

          // Clear the current playlist
          await mpdClient.playlistClear();

          // Handle different types of searches
          if (type === "artist" || type === "album") {
            // For artists or albums, add all matching songs to the playlist
            const songsByAlbum = new Map<string, MpdSong[]>();

            // Group songs by album
            for (const song of results) {
              const albumName = song.album || "Unknown Album";
              if (!songsByAlbum.has(albumName)) {
                songsByAlbum.set(albumName, []);
              }
              songsByAlbum.get(albumName)!.push(song);
            }

            // Add all songs to the playlist
            console.error(`Adding ${results.length} songs to playlist`);
            for (const song of results) {
              try {
                console.error(`Adding song: ${song.file}`);
                await mpdClient.playlistAdd(song.file);
              } catch (addError) {
                console.error(`Error adding song: ${addError}`);
                // Continue to next song if one fails
              }
            }

            // Start playing
            await mpdClient.play(0);

            // Get current song
            const currentSong = await mpdClient.currentSong();

            // Prepare info text
            let infoText = "";
            if (type === "artist") {
              infoText = `Now playing music by ${query}. Added ${results.length} songs from ${songsByAlbum.size} albums to the playlist.`;
            } else {
              infoText = `Now playing album matching "${query}". Added ${results.length} songs to the playlist.`;
            }

            // Add current song info if available
            if (currentSong) {
              infoText += `\n\nNow playing: ${currentSong.artist || "Unknown Artist"} - ${currentSong.title || currentSong.file}`;
              if (currentSong.album) {
                infoText += ` (${currentSong.album})`;
              }
            }

            return {
              content: [
                {
                  type: "text",
                  text: infoText,
                },
              ],
            };
          } else {
            // For song titles or general searches, just play the first match
            const topMatch = results[0];

            // Add the song to the playlist
            console.error(`Adding song to playlist: ${topMatch.file}`);
            try {
              await mpdClient.playlistAdd(topMatch.file);
            } catch (addError) {
              console.error(`Error adding song: ${addError}`);
              throw new Error(
                `Could not add song to playlist: ${(addError as Error).message}`,
              );
            }

            // Start playing
            await mpdClient.play(0);

            // Format song info
            let songInfo = `${topMatch.artist || "Unknown Artist"} - ${topMatch.title || topMatch.file}`;
            if (topMatch.album) {
              songInfo += ` (${topMatch.album})`;
            }

            return {
              content: [
                {
                  type: "text",
                  text: `Now playing: ${songInfo}\n\nFound ${results.length} matches total for "${query}".`,
                },
              ],
            };
          }
        } catch (error) {
          throw new Error(`Error playing music: ${(error as Error).message}`);
        }
      }

      case "player": {
        const action = String(request.params.arguments?.action);
        const position =
          request.params.arguments?.position !== undefined
            ? Number(request.params.arguments.position)
            : undefined;

        try {
          switch (action) {
            case "resume":
              await mpdClient.play(position);
              break;
            case "pause":
              await mpdClient.pause();
              break;
            case "stop":
              await mpdClient.stop();
              break;
            case "next":
              await mpdClient.next();
              break;
            case "previous":
              await mpdClient.previous();
              break;
            default:
              throw new Error(`Unknown action: ${action}`);
          }

          const status = await mpdClient.status();
          return {
            content: [
              {
                type: "text",
                text: `Successfully executed '${action}' command. Current state: ${status.state}`,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Error executing '${action}' command: ${(error as Error).message}`,
          );
        }
      }

      case "volume": {
        const volume = Number(request.params.arguments?.volume);
        if (isNaN(volume) || volume < 0 || volume > 100) {
          throw new Error("Volume must be a number between 0 and 100");
        }

        try {
          await mpdClient.setVolume(volume);
          return {
            content: [
              {
                type: "text",
                text: `Volume set to ${volume}%`,
              },
            ],
          };
        } catch (error) {
          throw new Error(`Error setting volume: ${(error as Error).message}`);
        }
      }

      case "search": {
        const query = String(request.params.arguments?.query);
        // Type is optional, defaults to "any"
        const type = request.params.arguments?.type
          ? String(request.params.arguments.type)
          : "any";

        if (!query) {
          throw new Error("Search query is required");
        }

        try {
          // MPD uses 'any' as a search field
          const searchType = type;
          console.error(`Searching for ${searchType}: "${query}"`);
          const results = await mpdClient.search(searchType, query);

          if (results.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No results found for "${query}"`,
                },
              ],
            };
          }

          // Limit to top 15 results for clarity
          const topResults = results.slice(0, 15);

          // Group results by album if searching by artist
          if (type === "artist") {
            const albums = new Map<string, MpdSong[]>();

            for (const song of topResults) {
              const albumName = song.album || "Unknown Album";
              if (!albums.has(albumName)) {
                albums.set(albumName, []);
              }
              albums.get(albumName)!.push(song);
            }

            let resultText = `Found ${results.length} tracks${results.length > 15 ? " (showing top 15)" : ""} for artist: ${query}\n\n`;
            let resultData: Array<{
              artist: string;
              title: string;
              album: string;
              file: string;
              id?: number;
              position?: number;
            }> = [];

            albums.forEach((songs, album) => {
              resultText += `Album: ${album}\n`;
              songs.forEach((song) => {
                resultText += `- ${song.title || song.file}\n`;
                resultData.push({
                  artist: song.artist || "Unknown Artist",
                  title: song.title || song.file,
                  album: song.album || "Unknown Album",
                  file: song.file,
                  id: song.id,
                  position: song.pos,
                });
              });
              resultText += "\n";
            });

            // Return only text content for now to avoid format issues
            return {
              content: [{ type: "text", text: resultText }],
            };
          }

          // Standard result formatting for other search types
          let resultText = `Found ${results.length} results for "${query}"${results.length > 15 ? " (showing top 15)" : ""}:\n\n`;
          const resultData: Array<{
            artist: string;
            title: string;
            album: string;
            file: string;
            id?: number;
            position?: number;
          }> = [];

          topResults.forEach((song, index) => {
            resultText += `${index + 1}. ${song.artist || "Unknown Artist"} - ${song.title || song.file}`;
            if (song.album) {
              resultText += ` (${song.album})`;
            }
            resultText += "\n";

            // Add a tip for how to play this exact song
            if (index === 0) {
              resultText += `   To play this song, use: play with {"query": "${song.title}"}\n\n`;
            }

            resultData.push({
              artist: song.artist || "Unknown Artist",
              title: song.title || song.file,
              album: song.album || "Unknown Album",
              file: song.file,
              id: song.id,
              position: song.pos,
            });
          });

          if (results.length > 15) {
            resultText += `\n...and ${results.length - 15} more matches.`;
          }

          // Return only text content for now to avoid format issues
          return {
            content: [{ type: "text", text: resultText }],
          };
        } catch (error) {
          throw new Error(`Error searching music: ${(error as Error).message}`);
        }
      }

      case "playlist": {
        const action = String(request.params.arguments?.action);
        const uri =
          request.params.arguments?.uri !== undefined
            ? String(request.params.arguments.uri)
            : undefined;
        const position =
          request.params.arguments?.position !== undefined
            ? Number(request.params.arguments.position)
            : undefined;

        try {
          switch (action) {
            case "add":
              if (!uri) {
                throw new Error("URI is required for add action");
              }
              await mpdClient.playlistAdd(uri);
              return {
                content: [{ type: "text", text: `Added '${uri}' to playlist` }],
              };

            case "delete":
              if (position === undefined) {
                throw new Error("Position is required for delete action");
              }
              await mpdClient.playlistDelete(position);
              return {
                content: [
                  {
                    type: "text",
                    text: `Removed item at position ${position} from playlist`,
                  },
                ],
              };

            case "clear":
              await mpdClient.playlistClear();
              return {
                content: [{ type: "text", text: "Playlist cleared" }],
              };

            default:
              throw new Error(`Unknown action: ${action}`);
          }
        } catch (error) {
          throw new Error(
            `Error managing playlist: ${(error as Error).message}`,
          );
        }
      }

      case "settings": {
        const repeat =
          request.params.arguments?.repeat !== undefined
            ? Boolean(request.params.arguments.repeat)
            : undefined;
        const random =
          request.params.arguments?.random !== undefined
            ? Boolean(request.params.arguments.random)
            : undefined;
        const single =
          request.params.arguments?.single !== undefined
            ? Boolean(request.params.arguments.single)
            : undefined;
        const consume =
          request.params.arguments?.consume !== undefined
            ? Boolean(request.params.arguments.consume)
            : undefined;

        try {
          const changes: string[] = [];

          if (repeat !== undefined) {
            await mpdClient.setRepeat(repeat);
            changes.push(`repeat: ${repeat ? "on" : "off"}`);
          }

          if (random !== undefined) {
            await mpdClient.setRandom(random);
            changes.push(`random: ${random ? "on" : "off"}`);
          }

          if (single !== undefined) {
            await mpdClient.setSingle(single);
            changes.push(`single: ${single ? "on" : "off"}`);
          }

          if (consume !== undefined) {
            await mpdClient.setConsume(consume);
            changes.push(`consume: ${consume ? "on" : "off"}`);
          }

          if (changes.length === 0) {
            return {
              content: [{ type: "text", text: "No options were changed" }],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `Updated playback options: ${changes.join(", ")}`,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Error setting playback options: ${(error as Error).message}`,
          );
        }
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.error("Error in CallToolRequestSchema handler:", error);
    throw error;
  }
});

/**
 * Helper function to ensure the MPD client is connected
 */
export async function ensureConnected(): Promise<void> {
  if (!(mpdClient as any).connected) {
    try {
      await mpdClient.connect();
      console.error(`Connected to MPD server at ${MPD_HOST}:${MPD_PORT}`);
    } catch (error) {
      console.error("Failed to connect to MPD server:", error);
      throw new Error(
        `Failed to connect to MPD server: ${(error as Error).message}`,
      );
    }
  }
}

/**
 * Start the server using stdio transport
 */
async function main() {
  try {
    // Initialize the transport first
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    // Now connect to MPD in background
    mpdClient
      .connect()
      .then(() =>
        console.error(`Connected to MPD server at ${MPD_HOST}:${MPD_PORT}`),
      )
      .catch((error) =>
        console.error("Failed to connect to MPD server:", error),
      );
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.error("Shutting down...");
  try {
    await mpdClient.disconnect();
    console.error("Disconnected from MPD server");
  } catch (error) {
    console.error("Error disconnecting from MPD server:", error);
  }
  process.exit(0);
});

// Handle other signals
process.on("SIGTERM", () => {
  console.error("Received SIGTERM");
  process.exit(0);
});

// Start the server
main();
