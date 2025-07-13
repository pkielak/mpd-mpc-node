// example.ts - Example of using the MPD model context protocol

import { mpdContext } from "./server.ts";

/**
 * A simple demonstration of using the MPD Context
 * to control MPD playback and get information.
 */
async function mpdDemo() {
  try {
    console.log("MPD Model Context Protocol Demo");
    console.log("===============================");

    // Get MPD status
    console.log("\n1. Getting MPD status...");
    const status = await mpdContext.getStatus();
    console.log(status);

    // Get current song info
    console.log("\n2. Getting current song...");
    const currentSong = await mpdContext.getCurrentSong();
    console.log(currentSong);

    // Get the queue
    console.log("\n3. Getting the queue...");
    const queue = await mpdContext.getQueue();
    console.log(`Queue has ${queue.length} items`);

    if (queue.length > 0) {
      console.log("First 3 songs in queue (or all if fewer):");
      queue.slice(0, 3).forEach((song, index) => {
        console.log(
          `  ${index + 1}. ${song.title || song.file} - ${song.artist || "Unknown"}`,
        );
      });
    }

    // Playback control demo
    console.log("\n4. Playback control demo...");

    // Play the first song if not already playing
    if (status.state !== "play" && queue.length > 0) {
      console.log("Starting playback...");
      await mpdContext.play(0);
      console.log("Playback started");
    } else if (queue.length === 0) {
      console.log("Queue is empty, can't start playback");
    } else {
      console.log("Already playing");
    }

    // Wait a moment
    console.log("Waiting 2 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check volume and adjust if needed
    console.log("\n5. Volume control demo...");
    const currentVolume = parseInt(status.volume);
    console.log(`Current volume: ${currentVolume}`);

    const newVolume =
      currentVolume < 50 ? 50 : currentVolume > 80 ? 70 : currentVolume;
    if (newVolume !== currentVolume) {
      console.log(`Setting volume to ${newVolume}...`);
      await mpdContext.setVolume(newVolume);
      console.log("Volume adjusted");
    }

    // Playback options demo
    console.log("\n6. Playback options demo...");
    const isRandom = status.random === "1";
    console.log(`Current random mode: ${isRandom}`);

    console.log(`Setting random mode to ${!isRandom}...`);
    await mpdContext.setRandom(!isRandom);
    console.log("Random mode toggled");

    // Music library demo (instead of playlists)
    console.log("\n7. Music library demo...");
    console.log("Getting available albums...");
    const albums = await mpdContext.getPlaylists();

    if (albums.length > 0) {
      console.log(`Found ${albums.length} albums:`);
      albums.forEach((album, index) => {
        console.log(`  ${index + 1}. ${album.Album || "Unknown"}`);
      });

      // Let's just list artists instead of trying to get playlist contents
      console.log("\nListing artists...");
      try {
        // We can't access client directly, use our context method instead
        const artists = await mpdContext.listArtists();
        console.log(`Found ${artists.length} artists`);
        if (artists.length > 5) {
          console.log("First 5 artists:");
          artists.slice(0, 5).forEach((artist, index) => {
            console.log(`  ${index + 1}. ${artist || "Unknown"}`);
          });
        }
      } catch (error) {
        console.log("Error listing artists:", error.message);
      }
    } else {
      console.log("No albums found");
    }

    // Get final status
    console.log("\n8. Getting final MPD status...");
    const finalStatus = await mpdContext.getStatus();
    console.log(finalStatus);
  } catch (error) {
    console.error("Error in MPD demo:", error.message);
  }
}

// Run the demo
console.log("Connecting to MPD...");
mpdDemo().then(() => {
  console.log("\nDemo completed!");
  console.log(
    "The MPD model context provides an easy way to control MPD playback",
  );
  console.log(
    "and manage playlists without requiring a full server or REST API.",
  );
});
