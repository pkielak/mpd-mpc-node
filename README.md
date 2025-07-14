# MPD MCP Server

A Music Player Daemon (MPD) server using Model Context Protocol (MCP) to provide LLM access to your music library.

## Overview

This project provides a bridge between MPD (Music Player Daemon) and the Model Context Protocol (MCP). It allows AI models to:

- Control music playback (play, pause, stop, next, previous)
- Play specific artists, albums, or songs by name
- Manage playlists (add, remove, clear)
- Search the music library
- Get information about the current playing track
- Adjust volume and playback settings

## Prerequisites

- Node.js v18 or higher
- An MPD server running locally or remotely
- TypeScript (for development)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mpd-mpc-node.git
   # mpd-mpc-node

   Music Player Daemon (MPD) MCP Server - Control your music with language models via the Model Context Protocol
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Configuration

The server can be configured using environment variables:

- `MPD_HOST`: MPD server hostname (default: `localhost`)
- `MPD_PORT`: MPD server port (default: `6600`)
- `TRANSPORT`: Transport protocol, either `stdio` or `http` (default: `stdio`)
- `HTTP_PORT`: Port for HTTP server when using HTTP transport (default: `3000`)

### Running the Server

Start the server in stdio mode (for use with LLM applications that support MCP):

```bash
npm start
```

Or run in HTTP mode for development and testing:

```bash
TRANSPORT=http npm start
```

For development with hot reloading:

```bash
npm run dev
```

## MCP Resources

The server exposes the following MCP resources:

- `status`: Current MPD status (state, volume, playlist info)
- `current-song`: Information about the currently playing song
- `playlist`: Current playlist contents
- `stats`: MPD server statistics
- `library`: Complete music library

## MCP Tools

The server provides the following MCP tools:

### Basic Playback

Simple playback controls:

```json
// Start playing music
{}  // No parameters needed for play_music

// Pause music
{}  // No parameters needed for pause_music

// Skip to next track
{}  // No parameters needed for next_track
```

### Play Specific Music

Play music by artist, album, or song title:

```json
// Play music by an artist
{
  "query": "deftones",
  "type": "artist"
}

// Play an album
{
  "query": "white pony",
  "type": "album"
}

// Play a specific song
{
  "query": "be quiet",
  "type": "title"
}

// Simple search and play
{
  "query": "deftones"
}
```

**Important tips for play_specific:**
- Use simple, short search terms (e.g., "be quiet" instead of "Be Quiet and Drive (Far Away)")
- For song titles, avoid including artist names, album names, or parentheses
- If you're copying from search results, extract just the main title part
- When in doubt, use fewer words in your query for better results

### Advanced Playback Control

Control music playback:

```json
{
  "action": "play|pause|stop|next|previous",
  "position": 0 // Optional position for play action
}
```

### Volume Control

Adjust volume:

```json
{
  "volume": 50 // 0-100
}
```

### Search Music

Search the music library:

```json
// Simple search (searches all fields)
{
  "query": "search term"
}

// Field-specific search
{
  "query": "search term",
  "type": "artist|album|title|any"
}
```

The search results include both human-readable text and structured JSON data that can be used by other tools:

```json
{
  "count": 5,
  "results": [
    {
      "artist": "Artist Name",
      "title": "Song Title",
      "album": "Album Name",
      "file": "path/to/file.mp3",
      "id": 123,
      "position": 4
    },
    // more results...
  ]
}
```

### Playlist Manager

Manage the playlist:

```json
{
  "action": "add|delete|clear",
  "uri": "file:///path/to/song.mp3", // Required for add
  "position": 0 // Required for delete
}
```

### Playback Options

Set playback options:

```json
{
  "repeat": true, // Optional
  "random": false, // Optional
  "single": false, // Optional
  "consume": false // Optional
}
```

## Help Tool

The server includes a help tool that provides guidance on using the available tools:

```json
// Get general help
{} 

// Get help on a specific topic
{
  "topic": "search|playback|playlist|volume"
}
```

## Using with Jan.ai

To use this MCP server with Jan.ai, add the following configuration in Jan.ai's MCP settings:

```json
{
  "command": "node",
  "args": ["/path/to/mpd-mpc-node/dist/server.js"],
  "env": {
    "MPD_HOST": "localhost",
    "MPD_PORT": "6600"
  },
  "active": true
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.