// method_test.ts - Test available MPD client methods
import { TCPClient } from "@teemukurki/mpd-deno-client";
import { MPDClient } from "@teemukurki/mpd";

// Configuration
const MPD_HOST = Deno.env.get("MPD_HOST") || "localhost";
const MPD_PORT = parseInt(Deno.env.get("MPD_PORT") || "6600");

async function testMPDClientMethods() {
  console.log("MPD Client Method Test");
  console.log("=====================");
  console.log(`Connecting to MPD at ${MPD_HOST}:${MPD_PORT}...`);

  try {
    // Create client
    const client = new MPDClient(TCPClient, MPD_HOST, MPD_PORT);

    // Get all methods of the client object
    const methods = Object.getOwnPropertyNames(MPDClient.prototype)
      .filter(name => typeof client[name] === 'function' && name !== 'constructor');

    console.log("\nAvailable methods on MPDClient:");
    console.log("------------------------------");
    methods.forEach(method => console.log(`- ${method}`));

    // Test some basic methods
    console.log("\nTesting basic methods:");
    console.log("-----------------------");

    // Test status method
    console.log("\nTesting status():");
    try {
      const status = await client.status();
      console.log("Status:", status);
    } catch (error) {
      console.error("Error calling status():", error.message);
    }

    // Try some potential methods for getting current song
    console.log("\nTrying methods to get current song:");
    const potentialMethods = ['currentsong', 'current', 'currentSong', 'currentsong'];

    for (const method of potentialMethods) {
      if (typeof client[method] === 'function') {
        try {
          console.log(`Testing ${method}():`);
          const result = await client[method]();
          console.log(`${method}() result:`, result);
        } catch (error) {
          console.error(`Error calling ${method}():`, error.message);
        }
      } else {
        console.log(`Method ${method}() not available`);
      }
    }

    // Try some potential methods for getting queue
    console.log("\nTrying methods to get queue:");
    const queueMethods = ['queue', 'playlist', 'playlistinfo', 'playlistInfo'];

    for (const method of queueMethods) {
      if (typeof client[method] === 'function') {
        try {
          console.log(`Testing ${method}():`);
          const result = await client[method]();
          console.log(`${method}() returned array with ${result.length} items`);
          if (result.length > 0) {
            console.log("First item:", result[0]);
          }
        } catch (error) {
          console.error(`Error calling ${method}():`, error.message);
        }
      } else {
        console.log(`Method ${method}() not available`);
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\nTest completed.");
}

// Run the test
testMPDClientMethods();
