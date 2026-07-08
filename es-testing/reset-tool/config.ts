/**
 * Configuration management for the Reset Tool.
 *
 * Reads/writes .reset-tool.json at the project root (gitignored).
 * Stores: server, database, domain, username, blueprintPersonKey, lastPersonKey.
 * Never stores passwords.
 */
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../.reset-tool.json');

export interface ResetToolConfig {
  /** SQL Server hostname */
  server: string;
  /** Database name */
  database: string;
  /** Windows domain for NTLM auth (only used when msnodesqlv8 is unavailable) */
  domain: string;
  /** Windows username without domain prefix (only used when msnodesqlv8 is unavailable) */
  username: string;
  /** Blueprint person key (template to clone from) */
  blueprintPersonKey: string;
  /** Last used person key (for convenience) */
  lastPersonKey: string;
}

const DEFAULTS: ResetToolConfig = {
  server: '',
  database: '',
  domain: '',
  username: '',
  blueprintPersonKey: '9b9a7a67-8baa-4b8b-b31d-b47b012b5e46',
  lastPersonKey: '',
};

/**
 * Load config from disk, merging with defaults for any missing keys.
 */
export function loadConfig(): ResetToolConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Save config to disk (overwrites existing).
 */
export function saveConfig(config: ResetToolConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Check if the config has the minimum required fields to connect.
 */
export function isConfigured(config: ResetToolConfig): boolean {
  return !!(config.server && config.database);
}
