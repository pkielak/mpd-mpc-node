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
    name: "mpd-mcp-server",
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
        description: "Current MPD playback status",
      },
      {
        uri: "mpd://current-song",
        mimeType: "application/json",
        name: "Current Song",
        description: "Information about the currently playing song",
      },
      {
        uri: "mpd://playlist",
        mimeType: "application/json",
        name: "Playlist",
        description: "Current MPD playlist contents",
      },
      {
        uri: "mpd://stats",
        mimeType: "application/json",
        name: "MPD Stats",
        description: "Statistics about the MPD server and music library",
      },
      {
        uri: "mpd://library",
        mimeType: "application/json",
        name: "Music Library",
        description: "Complete listing of available music in the MPD library",
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
        name: "playback_control",
        description:
          "Control music playback (play, pause, stop, next, previous)",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["play", "pause", "stop", "next", "previous"],
              description: "Playback action to perform",
            },
            position: {
              type: "number",
              description:
                "Optional position in playlist to play (only used with 'play' action)",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "volume_control",
        description: "Set the volume level (0-100)",
        inputSchema: {
          type: "object",
          properties: {
            volume: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Volume level (0-100)",
            },
          },
          required: ["volume"],
        },
      },
      {
        name: "search_music",
        description: "Search for music in the MPD library",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["artist", "album", "title", "genre", "any"],
              description: "Type of search to perform",
            },
            query: {
              type: "string",
              description: "Search query",
            },
          },
          required: ["type", "query"],
        },
      },
      {
        name: "playlist_manager",
        description: "Manage the MPD playlist (add, delete, clear)",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["add", "delete", "clear"],
              description: "Playlist action to perform",
            },
            uri: {
              type: "string",
              description: "URI of song to add (required for 'add' action)",
            },
            position: {
              type: "number",
              description:
                "Position in playlist (required for 'delete' action)",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "playback_options",
        description:
          "Set MPD playback options (repeat, random, single, consume)",
        inputSchema: {
          type: "object",
          properties: {
            repeat: {
              type: "boolean",
              description: "Enable/disable repeat mode",
            },
            random: {
              type: "boolean",
              description: "Enable/disable random mode",
            },
            single: {
              type: "boolean",
              description: "Enable/disable single mode",
            },
            consume: {
              type: "boolean",
              description: "Enable/disable consume mode",
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
      case "playback_control": {
        const action = String(request.params.arguments?.action);
        const position =
          request.params.arguments?.position !== undefined
            ? Number(request.params.arguments.position)
            : undefined;

        try {
          switch (action) {
            case "play":
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

      case "volume_control": {
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

      case "search_music": {
        const type = String(request.params.arguments?.type);
        const query = String(request.params.arguments?.query);

        if (!type || !query) {
          throw new Error("Search type and query are required");
        }

        try {
          // Fix search arguments format - MPD expects the search type and query as separate args
          const searchType = type === "any" ? "any" : type;
          // Use console.error for debugging
          console.error(`Searching for ${searchType}: "${query}"`);
          const results = await mpdClient.search(searchType, query);

          if (results.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No results found for ${type}: ${query}`,
                },
              ],
            };
          }

          // Group results by album if searching by artist
          if (type === "artist") {
            const albums = new Map<string, MpdSong[]>();

            for (const song of results) {
              const albumName = song.album || "Unknown Album";
              if (!albums.has(albumName)) {
                albums.set(albumName, []);
              }
              albums.get(albumName)!.push(song);
            }

            let resultText = `Found ${results.length} tracks in ${albums.size} albums for artist: ${query}\n\n`;

            albums.forEach((songs, album) => {
              resultText += `Album: ${album}\n`;
              songs.forEach((song) => {
                resultText += `- ${song.title || song.file}\n`;
              });
              resultText += "\n";
            });

            return {
              content: [{ type: "text", text: resultText }],
            };
          }

          // Standard result formatting for other search types
          let resultText = `Found ${results.length} results for ${type}: ${query}\n\n`;
          results.forEach((song, index) => {
            resultText += `${index + 1}. ${song.artist || "Unknown Artist"} - ${song.title || song.file}`;
            if (song.album) {
              resultText += ` (${song.album})`;
            }
            resultText += "\n";
          });

          return {
            content: [{ type: "text", text: resultText }],
          };
        } catch (error) {
          throw new Error(`Error searching music: ${(error as Error).message}`);
        }
      }

      case "playlist_manager": {
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

      case "playback_options": {
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
