import { MockMpdClient } from "../mocks/mpd-client.mock";
import { MpdClient } from "../../mpd/types";

// Mock the MPD client
jest.mock("../../mpd/client", () => ({
  MpdClientImpl: jest.fn().mockImplementation(() => {
    return new MockMpdClient();
  }),
}));

// Use isolateModules to create a fresh copy of the server with mocked dependencies
describe("MCP Server Integration Tests", () => {
  let mpdClient: MockMpdClient;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get the mocked MPD client
    mpdClient = new MockMpdClient();
  });

  // This test verifies that the server properly initializes and connects to the MPD server
  it("should initialize and connect to MPD server", async () => {
    // We'll use isolateModules to get a fresh instance with our mocks
    await jest.isolateModules(async () => {
      // Import the server module which will trigger the initialization code
      const serverModule = await import("../../server");

      // Our mock should have been called during server startup
      expect(mpdClient.connect).toHaveBeenCalled();
    });
  });

  // This test verifies that the server handles graceful shutdown
  it("should disconnect from MPD server on process exit", async () => {
    await jest.isolateModules(async () => {
      // Import the server
      await import("../../server");

      // Simulate SIGINT
      process.emit("SIGINT");

      // Check that disconnect was called
      expect(mpdClient.disconnect).toHaveBeenCalled();
    });
  });

  // This is a comprehensive test that verifies the basic structure of our server
  it("should set up all required handlers", async () => {
    await jest.isolateModules(async () => {
      // Import the full Server implementation to inspect its handlers
      const { Server } = jest.requireActual(
        "@modelcontextprotocol/sdk/server/index.js",
      );

      // Spy on setRequestHandler to verify all handlers are registered
      const setRequestHandlerSpy = jest.spyOn(
        Server.prototype,
        "setRequestHandler",
      );

      // Import our server, which will trigger handler registration
      await import("../../server");

      // Verify that all required handlers are registered
      expect(setRequestHandlerSpy).toHaveBeenCalledTimes(4);

      // Check for specific handlers
      const handlerNames = setRequestHandlerSpy.mock.calls.map((call) => {
        // Extract schema name from the first argument
        const schema = call[0];
        return schema ? (schema as any).name || "unknown" : "unknown";
      });

      expect(handlerNames).toContain("ListResourcesRequestSchema");
      expect(handlerNames).toContain("ReadResourceRequestSchema");
      expect(handlerNames).toContain("ListToolsRequestSchema");
      expect(handlerNames).toContain("CallToolRequestSchema");

      // Clean up spy
      setRequestHandlerSpy.mockRestore();
    });
  });

  // Helper function test
  describe("ensureConnected", () => {
    it("should connect to MPD server if not already connected", async () => {
      await jest.isolateModules(async () => {
        // Import the server module with the ensureConnected function
        const serverModule = await import("../../server");

        // Access the ensureConnected function (assuming it's exported for testing)
        const ensureConnected = (serverModule as any).ensureConnected;

        // Reset the connected flag
        (mpdClient as any).connected = false;

        // Call ensureConnected
        await ensureConnected();

        // Verify connect was called
        expect(mpdClient.connect).toHaveBeenCalled();
      });
    });

    it("should not connect if already connected", async () => {
      await jest.isolateModules(async () => {
        // Import the server module
        const serverModule = await import("../../server");

        // Force the connected state to be true
        (mpdClient as any).connected = true;

        // Reset the mock call count
        (mpdClient.connect as jest.Mock).mockClear();

        // Call ensureConnected
        const ensureConnected = (serverModule as any).ensureConnected;
        await ensureConnected();

        // Verify connect was not called
        expect(mpdClient.connect).not.toHaveBeenCalled();
      });
    });
  });
});
