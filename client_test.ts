// client_test.ts
// A simple script to test the MPD model context protocol

import { mpdContext } from "./server.ts";

/**
 * Run a demo sequence to test the MPD control functions
 */

async function runDemo() {
  console.log("MPD Model Context Protocol Test");
  console.log("==============================");

  // Get initial status
  console.log("\n1. Getting current status:");
  const status = await mpdContext.getStatus();
  console.log(status);

  // Get current song if playing
  console.log("\n2. Getting current song:");
  const currentSong = await mpdContext.getCurrentSong();
  console.log(currentSong);

  // Get the queue
  console.log("\n3. Getting the queue:");
  const queue = await mpdContext.getQueue();
  console.log(`Queue has ${queue.length} items`);

  // Set volume to 70%
  console.log("\n4. Setting volume to 70%:");
  await mpdContext.setVolume(70);
  console.log("Volume set");

  // Toggle random mode
  console.log("\n5. Toggling random mode:");
  const randomState = status.random === "1" ? false : true;
  await mpdContext.setRandom(randomState);
  console.log(`Random mode set to ${randomState}`);

  // Play the first song in the queue if queue is not empty
  if (queue.length > 0) {
    console.log("\n6. Playing the first song in the queue:");
    await mpdContext.play(0);
    console.log("Playback started");

    // Wait 3 seconds then play next song
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("\n7. Playing next song:");
    await mpdContext.next();
    console.log("Next song");

    // Wait 3 seconds then pause
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("\n8. Pausing playback:");
    await mpdContext.pause();
    console.log("Playback paused");
  } else {
    console.log("\nQueue is empty, skipping playback tests");
  }

  // Final status
  console.log("\n9. Getting final status:");
  const finalStatus = await mpdContext.getStatus();
  console.log(finalStatus);

  console.log("\nDemo completed!");
}

// Run the demo
runDemo().catch(console.error);
