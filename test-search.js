#!/usr/bin/env node

/**
 * Test script for MPD client search function
 * This script tests the search functionality of the MPD client
 */

// Import the MPD client implementation
const { MpdClientImpl } = require('./dist/mpd/client');

// Configuration
const MPD_HOST = process.env.MPD_HOST || 'localhost';
const MPD_PORT = parseInt(process.env.MPD_PORT || '6600', 10);

// Create an instance of the MPD client
const mpdClient = new MpdClientImpl(MPD_HOST, MPD_PORT);

// Test search function with various parameters
async function testSearch() {
  try {
    // Connect to MPD server
    console.log(`Connecting to MPD server at ${MPD_HOST}:${MPD_PORT}...`);
    await mpdClient.connect();
    console.log('Connected to MPD server successfully');

    // Define search tests
    const searchTests = [
      { type: 'title', query: 'be quiet and drive' },
      { type: 'artist', query: 'deftones' },
      { type: 'album', query: 'white pony' },
      { type: 'any', query: 'rock' }
    ];

    // Run each search test
    for (const test of searchTests) {
      console.log(`\n--- Testing search with type: "${test.type}", query: "${test.query}" ---`);
      try {
        const results = await mpdClient.search(test.type, test.query);
        console.log(`Found ${results.length} results:`);
        if (results.length > 0) {
          results.forEach((song, index) => {
            console.log(`  ${index + 1}. ${song.artist || 'Unknown Artist'} - ${song.title || song.file} ${song.album ? `(${song.album})` : ''}`);
          });
        }
      } catch (searchError) {
        console.error(`Search error:`, searchError.message);
      }
    }

    // Test MPD status and current song
    console.log('\n--- Testing MPD status ---');
    const status = await mpdClient.status();
    console.log('MPD Status:', status);

    console.log('\n--- Testing current song ---');
    const currentSong = await mpdClient.currentSong();
    console.log('Current song:', currentSong);

  } catch (error) {
    console.error('Error in test script:', error.message);
  } finally {
    // Disconnect from MPD server
    try {
      await mpdClient.disconnect();
      console.log('Disconnected from MPD server');
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError.message);
    }
  }
}

// Run the test
testSearch().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
