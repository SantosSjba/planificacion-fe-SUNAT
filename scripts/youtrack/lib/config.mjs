import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Resolve YouTrack base URL + permanent token.
 * Prefer env; fallback to ~/.cursor/mcp.json youtrack server (strip /mcp).
 */
export function loadYouTrackConfig() {
  let url = (process.env.YOUTRACK_URL || '').replace(/\/$/, '');
  let token = (process.env.YOUTRACK_TOKEN || '').replace(/^Bearer\s+/i, '');

  if (!url || !token) {
    const mcpPath = process.env.YOUTRACK_MCP_JSON
      || path.join(os.homedir(), '.cursor', 'mcp.json');
    if (!fs.existsSync(mcpPath)) {
      throw new Error(
        'Set YOUTRACK_URL + YOUTRACK_TOKEN, or provide ~/.cursor/mcp.json with youtrack server',
      );
    }
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    const yt = mcp.mcpServers?.youtrack;
    if (!yt) throw new Error(`No mcpServers.youtrack in ${mcpPath}`);
    if (!url) {
      url = String(yt.url || '')
        .replace(/\?.*$/, '')
        .replace(/\/mcp\/?$/i, '')
        .replace(/\/$/, '');
    }
    if (!token) {
      const auth = yt.headers?.Authorization || yt.env?.YOUTRACK_TOKEN || '';
      token = String(auth).replace(/^Bearer\s+/i, '');
    }
  }

  if (!url || !token) {
    throw new Error('Missing YouTrack URL or token');
  }

  return { url, token, projectId: process.env.YOUTRACK_PROJECT_ID || '0-0', projectShort: 'FE' };
}

export function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}
