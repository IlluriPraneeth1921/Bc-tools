import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

export default defineConfig({
  outputDir: path.resolve(__dirname, 'test-results'),
  fullyParallel: false,
  retries: 0,
  timeout: 300_000,
  workers: 1,

  reporter: [
    ['html', { open: 'never', outputFolder: path.resolve(__dirname, 'reports/html') }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL,
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    headless: true,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'atc',
      testDir: './tests/atc',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ujt',
      testDir: './tests/ujt',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
