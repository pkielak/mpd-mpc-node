import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MockMpdClient } from "./mocks/mpd-client.mock";

// Mock the actual MPD client module
jest.mock("../mpd/client", () => ({
  MpdClientImpl: jest.fn().mockImplementation(() => {
    return new MockMpdClient();
  }),
}));

// Mock StdioServerTransport
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    // Mock any methods that the server uses
  })),
}));

// Mock Server class
jest.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  const originalModule = jest.requireActual(
    "@modelcontextprotocol/sdk/server/index.js",
  );

  // We'll store the registered handlers here
  const handlers: Record<string, any> = {};

  return {
    ...originalModule,
    Server: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      setRequestHandler: jest
        .fn()
        .mockImplementation((schema: any, handler: any) => {
          // Store the handler with a key derived from schema name
          const schemaName = schema.name || "unknown";
          handlers[schemaName] = handler;
        }),
      // Expose a method to access the stored handlers for testing
      __getHandler: (name: string) => handlers[name],
    })),
  };
});

describe("MCP Server", () => {
  let server: any;
  let mpdClient: MockMpdClient;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Import the server (which will be automatically mocked)
    // This will trigger the registration of handlers
    jest.isolateModules(() => {
      require("../server");
    });

    // Get instance of the mocked server
    server = new Server({
      name: "test-server",
      version: "1.0.0",
    });

    // The MPD client should be mocked via the module mock above
    mpdClient = new MockMpdClient();
  });

  describe("ListResourcesRequestSchema handler", () => {
    it("should list all available MPD resources", async () => {
      const handler = server.__getHandler("ListResourcesRequestSchema");
      const result = await handler({});

      expect(result).toHaveProperty("resources");
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources.length).toBe(5); // We expect 5 resources

      // Check if all required resources are present
      const resourceUris = result.resources.map((r: any) => r.uri);
      expect(resourceUris).toContain("mpd://status");
      expect(resourceUris).toContain("mpd://current-song");
      expect(resourceUris).toContain("mpd://playlist");
      expect(resourceUris).toContain("mpd://stats");
      expect(resourceUris).toContain("mpd://library");
    });
  });

  describe("ReadResourceRequestSchema handler", () => {
    it("should read MPD status resource", async () => {
      const handler = server.__getHandler("ReadResourceRequestSchema");
      const result = await handler({
        params: {
          uri: "mpd://status",
        },
      });

      expect(result).toHaveProperty("contents");
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBe(1);
      expect(result.contents[0]).toHaveProperty("uri", "mpd://status");
      expect(result.contents[0]).toHaveProperty("mimeType", "application/json");
      expect(result.contents[0]).toHaveProperty("text");

      // Parse the JSON to make sure it's valid
      const parsedJson = JSON.parse(result.contents[0].text);
      expect(parsedJson).toHaveProperty("state");
    });

    it("should read current song resource", async () => {
      const handler = server.__getHandler("ReadResourceRequestSchema");
      const result = await handler({
        params: {
          uri: "mpd://current-song",
        },
      });

      expect(result.contents[0]).toHaveProperty("uri", "mpd://current-song");

      const parsedJson = JSON.parse(result.contents[0].text);
      expect(parsedJson).toHaveProperty("title");
      expect(parsedJson).toHaveProperty("artist");
    });

    it("should read playlist resource", async () => {
      const handler = server.__getHandler("ReadResourceRequestSchema");
      const result = await handler({
        params: {
          uri: "mpd://playlist",
        },
      });

      expect(result.contents[0]).toHaveProperty("uri", "mpd://playlist");

      const parsedJson = JSON.parse(result.contents[0].text);
      expect(Array.isArray(parsedJson)).toBe(true);
      expect(parsedJson.length).toBeGreaterThan(0);
    });

    it("should read stats resource", async () => {
      const handler = server.__getHandler("ReadResourceRequestSchema");
      const result = await handler({
        params: {
          uri: "mpd://stats",
        },
      });

      expect(result.contents[0]).toHaveProperty("uri", "mpd://stats");

      const parsedJson = JSON.parse(result.contents[0].text);
      expect(parsedJson).toHaveProperty("artists");
      expect(parsedJson).toHaveProperty("albums");
      expect(parsedJson).toHaveProperty("songs");
    });

    it("should read library resource", async () => {
      const handler = server.__getHandler("ReadResourceRequestSchema");
      const result = await handler({
        params: {
          uri: "mpd://library",
        },
      });

      expect(result.contents[0]).toHaveProperty("uri", "mpd://library");

      const parsedJson = JSON.parse(result.contents[0].text);
      expect(Array.isArray(parsedJson)).toBe(true);
    });

    it("should throw an error for unknown resource", async () => {
      const handler = server.__getHandler("ReadResourceRequestSchema");

      await expect(
        handler({
          params: {
            uri: "mpd://unknown",
          },
        }),
      ).rejects.toThrow("Unknown resource: unknown");
    });
  });

  describe("ListToolsRequestSchema handler", () => {
    it("should list all available MPD tools", async () => {
      const handler = server.__getHandler("ListToolsRequestSchema");
      const result = await handler({});

      expect(result).toHaveProperty("tools");
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBe(5); // We expect 5 tools

      // Check if all required tools are present
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain("playback_control");
      expect(toolNames).toContain("volume_control");
      expect(toolNames).toContain("search_music");
      expect(toolNames).toContain("playlist_manager");
      expect(toolNames).toContain("playback_options");
    });
  });

  describe("CallToolRequestSchema handler", () => {
    it("should execute playback control play action", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");
      const result = await handler({
        params: {
          name: "playback_control",
          arguments: {
            action: "play",
          },
        },
      });

      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0].text).toContain(
        "Successfully executed 'play' command",
      );
    });

    it("should execute volume control", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");
      const result = await handler({
        params: {
          name: "volume_control",
          arguments: {
            volume: 75,
          },
        },
      });

      expect(result.content[0].text).toContain("Volume set to 75%");
    });

    it("should execute search music", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");
      const result = await handler({
        params: {
          name: "search_music",
          arguments: {
            type: "artist",
            query: "Test Artist",
          },
        },
      });

      expect(result.content[0].text).toContain("Found");
    });

    it("should execute playlist manager add action", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");
      const result = await handler({
        params: {
          name: "playlist_manager",
          arguments: {
            action: "add",
            uri: "test3.mp3",
          },
        },
      });

      expect(result.content[0].text).toContain("Added 'test3.mp3' to playlist");
    });

    it("should execute playlist manager clear action", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");
      const result = await handler({
        params: {
          name: "playlist_manager",
          arguments: {
            action: "clear",
          },
        },
      });

      expect(result.content[0].text).toContain("Playlist cleared");
    });

    it("should execute playback options", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");
      const result = await handler({
        params: {
          name: "playback_options",
          arguments: {
            repeat: true,
            random: true,
          },
        },
      });

      expect(result.content[0].text).toContain("Updated playback options");
      expect(result.content[0].text).toContain("repeat: on");
      expect(result.content[0].text).toContain("random: on");
    });

    it("should throw an error for unknown tool", async () => {
      const handler = server.__getHandler("CallToolRequestSchema");

      await expect(
        handler({
          params: {
            name: "unknown_tool",
            arguments: {},
          },
        }),
      ).rejects.toThrow("Unknown tool: unknown_tool");
    });
  });
});
