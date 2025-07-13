# MPD MCP Server

A Music Player Daemon (MPD) server using Model Context Protocol (MCP) to provide LLM access to your music library.

## Overview

This project provides a bridge between MPD (Music Player Daemon) and the Model Context Protocol (MCP). It allows AI models to:

- Control music playback (play, pause, stop, next, previous)
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
   cd mpd-mpc-node
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

### Playback Control

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
{
  "type": "artist|album|title|genre|any",
  "query": "search term"
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.