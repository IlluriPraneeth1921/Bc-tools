/**
 * Playwright Configuration — Pipeline Testing (pl-test)
 *
 * Supports multiple test projects:
 * - atc-mock: Atomic Test Cases with mocked API responses (no backend needed)
 * - atc-live: Atomic Test Cases against running Streamlit + FastAPI
 * - ujt-mock: User Journey Tests with mocked API (sequential)
 * - ujt-live: User Journey Tests against running backend (sequential)
 * - api: Direct REST API endpoint testing (requires running FastAPI)
 * - accessibility: 508 compliance tests (axe-core)
 *
 * Usage:
 *   # Mock mode (default — no backend required)
 *   npx playwright test --config=playwright.config.ts
 *
 *   # Live mode — tests against running backend
 *   set LIVE_MODE=true && npx playwright test --config=playwright.config.ts --project=atc-live
 *
 *   # API tests only
 *   set LIVE_MODE=true && npx playwright test --config=playwright.config.ts --project=api
 */

import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Load .env ───────────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const isLiveMode = process.env.LIVE_MODE === 'true';
const baseURL = process.env.BASE_URL || 'http://localhost:8501';
const apiBaseURL = process.env.API_BASE_URL || 'http://localhost:8000';
const authFile = path.resolve(__dirname, '.auth/storage-state.json');

// ─── Config ──────────────────────────────────────────────────────────────────
export default defineConfig({
  outputDir: path.resolve(__dirname, 'results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : (isLiveMode ? 1 : 0),
  workers: isLiveMode ? 4 : (process.env.CI ? 4 : undefined),
  timeout: isLiveMode ? 60_000 : 30_000,

  reporter: [
    ['html', { open: 'never', outputFolder: path.resolve(__dirname, 'reports/html') }],
    ['junit', { outputFile: path.resolve(__dirname, 'reports/junit-results.xml') }],
    ['json', { outputFile: path.resolve(__dirname, 'reports/results.json') }],
    ['list'],
  ],

  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // ─── Auth Setup (live mode only) ─────────────────────────────────────────
    ...(isLiveMode
      ? [
          {
            name: 'auth-setup',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : []),

    // ─── ATC Mock Mode (default — mocked API) ───────────────────────────────
    {
      name: 'atc-mock',
      testDir: './atc',
      testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.journey.spec.ts', '**/auth.setup.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ─── ATC Live Mode ───────────────────────────────────────────────────────
    ...(isLiveMode
      ? [
          {
            name: 'atc-live',
            testDir: './atc',
            testMatch: '**/*.spec.ts',
            testIgnore: ['**/*.journey.spec.ts', '**/auth.setup.ts'],
            dependencies: ['auth-setup'],
            use: {
              ...devices['Desktop Chrome'],
              storageState: authFile,
            },
          },
        ]
      : []),

    // ─── UJT Mock Mode ──────────────────────────────────────────────────────
    {
      name: 'ujt-mock',
      testDir: './ujt',
      testMatch: '**/*.journey.spec.ts',
      fullyParallel: false,
      timeout: 90_000,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ─── UJT Live Mode ──────────────────────────────────────────────────────
    ...(isLiveMode
      ? [
          {
            name: 'ujt-live',
            testDir: './ujt',
            testMatch: '**/*.journey.spec.ts',
            fullyParallel: false,
            timeout: 180_000,
            dependencies: ['auth-setup'],
            use: {
              ...devices['Desktop Chrome'],
              storageState: authFile,
            },
          },
        ]
      : []),

    // ─── API Tests (live mode only — direct REST API testing) ────────────────
    ...(isLiveMode
      ? [
          {
            name: 'api',
            testDir: './api',
            testMatch: '**/*.api.spec.ts',
            timeout: 30_000,
            use: {
              baseURL: apiBaseURL,
              ...devices['Desktop Chrome'],
            },
          },
        ]
      : []),

    // ─── Accessibility (508) Tests ───────────────────────────────────────────
    {
      name: 'accessibility',
      testDir: './atc',
      testMatch: '**/*-accessibility.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
