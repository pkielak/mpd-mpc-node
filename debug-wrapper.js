#!/usr/bin/env node

/**
 * MCP Server Debug Wrapper
 *
 * This script wraps an MCP server to diagnose communication issues.
 * It forwards stdin/stdout while logging all communication to stderr.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a log file for debugging
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, `mcp-debug-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;

  // Log to stderr and file
  process.stderr.write(formattedMessage);
  logStream.write(formattedMessage);
}

log('MCP Debug Wrapper starting');

// Get the server path from args or use default
const serverPath = path.join(__dirname, 'dist', 'server.js');
log(`Starting MCP server at ${serverPath}`);

// Start the actual MCP server
const mpcServer = spawn('node', [serverPath], {
  env: {
    ...process.env,
    MPD_HOST: process.env.MPD_HOST || 'localhost',
    MPD_PORT: process.env.MPD_PORT || '6600'
  }
});

log('MPC server process started');

// Log and forward stdin to the server
process.stdin.on('data', (data) => {
  try {
    const input = data.toString();
    log(`STDIN → SERVER: ${input.trim()}`);

    // Try to parse and pretty-print if it's JSON
    try {
      const parsed = JSON.parse(input);
      log(`PARSED INPUT: ${JSON.stringify(parsed, null, 2)}`);
    } catch (e) {
      // Not JSON or invalid JSON, ignore
    }

    mpcServer.stdin.write(data);
  } catch (error) {
    log(`Error processing stdin: ${error.message}`);
  }
});

// Log and forward server output to stdout
mpcServer.stdout.on('data', (data) => {
  try {
    const output = data.toString();
    log(`SERVER → STDOUT: ${output.trim()}`);

    // Try to parse and pretty-print if it's JSON
    try {
      const parsed = JSON.parse(output);
      log(`PARSED OUTPUT: ${JSON.stringify(parsed, null, 2)}`);
    } catch (e) {
      // Not JSON or invalid JSON, ignore
    }

    process.stdout.write(data);
  } catch (error) {
    log(`Error processing stdout: ${error.message}`);
  }
});

// Log server errors
mpcServer.stderr.on('data', (data) => {
  log(`SERVER ERROR: ${data.toString().trim()}`);
});

// Handle server exit
mpcServer.on('exit', (code, signal) => {
  log(`MPC server exited with code ${code} and signal ${signal}`);
  // Exit with the same code
  process.exit(code);
});

// Forward termination signals
process.on('SIGINT', () => {
  log('Received SIGINT, forwarding to server');
  mpcServer.kill('SIGINT');
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, forwarding to server');
  mpcServer.kill('SIGTERM');
});

// Handle our own exit
process.on('exit', () => {
  log('Debug wrapper exiting');
  logStream.end();
});

log('MCP Debug Wrapper initialized and ready');
