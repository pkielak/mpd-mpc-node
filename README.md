# MPD Model Context Protocol

A Deno-based model context protocol interface for controlling Music Player Daemon (MPD). This library provides a clean, programmatic interface for controlling MPD playback, queue management, and other MPD features using the @teemukurki/mpd client library.

## Setup

### Prerequisites

- [Deno](https://deno.land/) installed
- MPD server running (locally or remotely)

### Configuration

The MPD connection can be configured using environment variables:

- `MPD_HOST`: MPD server hostname (default: "localhost")
- `MPD_PORT`: MPD server port (default: 6600)

## Usage

The model context protocol is designed to be imported and used in your Deno applications:

```typescript
import { mpdContext } from "./server.ts";

// Get current status
const status = await mpdContext.getStatus();
console.log(status);

// Play a song
await mpdContext.play(0); // Play the first song in the queue

// Set volume
await mpdContext.setVolume(70);
```

You can run the example script to see the protocol in action:

```bash
deno task run-example
```

## Available Methods

### Status & Information

- `getStatus()` - Get MPD status information
- `getCurrentSong()` - Get currently playing song
- `getQueue()` - Get the current playlist queue

### Playback Control

- `play(position?: number)` - Start playback (optionally at a specific position)
- `pause()` - Pause playback
- `stop()` - Stop playback
- `next()` - Play next song
- `previous()` - Play previous song

### Volume Control

- `setVolume(volume: number)` - Set volume (0-100) - *Simulated as not directly available in the library*

### Playback Options

- `setRandom(state: boolean)` - Set random mode - *Simulated as not directly available in the library*
- `setRepeat(state: boolean)` - Set repeat mode - *Simulated as not directly available in the library*
- `setSingle(state: boolean)` - Set single mode - *Simulated as not directly available in the library*
- `setConsume(state: boolean)` - Set consume mode - *Simulated as not directly available in the library*

### Database & Queue Operations

- `search(query: string)` - Search the MPD database - *Uses listTracks() as fallback*
- `add(uri: string)` - Add a song to the queue - *Maps to addToQueue()*
- `clear()` - Clear the current queue - *Maps to clearQueue()*
- `update()` - Update the MPD database - *Simulated as not directly available in the library*

### Library Management

- `getPlaylists()` - Get all available albums - *Maps to listAlbums()*
- `getPlaylist(name: string)` - Get tracks in an album - *Maps to listTracks()*
- `loadPlaylist(name: string)` - Load an album into the queue - *Maps to addAlbumToQueue()*
- `listArtists()` - List all artists in the database

## Example Usage

Here's a simple example of how to use the model context protocol:

```typescript
import { mpdContext } from "./server.ts";

// Basic playback control
async function playbackDemo() {
  // Get current status
  const status = await mpdContext.getStatus();
  console.log(`Current state: ${status.state}`);
  
  // Get current song
  const song = await mpdContext.getCurrentSong();
  console.log(`Now playing: ${song.Title} by ${song.Artist}`);
  
  // Play next song
  await mpdContext.next();
  console.log("Skipped to next song");
  
  // Set volume to 70% (note: simulated function)
  await mpdContext.setVolume(70);
  console.log("Volume set to 70%");
  
  // List some artists
  const artists = await mpdContext.listArtists();
  console.log(`Music library has ${artists.length} artists`);
  
  // Add an album to the queue
  if (artists.length > 0) {
    await mpdContext.loadPlaylist(artists[0]);
    console.log(`Added music by ${artists[0]} to queue`);
  }
}

playbackDemo();
```

## Example Scripts

The project includes example scripts to demonstrate usage:

```bash
# Run the full example script
deno task run-example

# Run the client test script (demonstrates core functionality)
deno task test-client
```

## Project Structure

- `server.ts`: The MPD model context protocol implementation
- `client_test.ts`: A simple script that demonstrates protocol usage
- `example.ts`: A more comprehensive example of using the protocol
- `method_test.ts`: A utility to discover available MPD client methods

## Library Limitations

This model context protocol is built on top of the @teemukurki/mpd library, which has some limitations:

1. **Limited MPD Command Support**: The library doesn't support all MPD commands. Some functions like volume control and playback modes are simulated.

2. **Playlist vs Album**: The library uses album-related functions rather than playlist-specific commands, so playlist management is mapped to album management.

3. **Function Name Differences**: The MPD protocol functions are implemented with slightly different names than the standard MPD protocol.

For additional functionality, consider using a more comprehensive MPD client library.

## License

MIT