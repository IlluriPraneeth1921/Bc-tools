/**
 * API Test Fixture — Pipeline Testing (REST API)
 *
 * Provides an authenticated API client for direct REST endpoint testing.
 * Tests run against the live FastAPI backend (LIVE_MODE=true required).
 *
 * Usage:
 *   import { test, expect } from '../fixtures/api.fixture';
 *   test('API-FIL-001', async ({ api }) => {
 *     const response = await api.get('/api/files/interfaces');
 *     expect(response.status).toBe(200);
 *   });
 */

import { test as base, expect, APIRequestContext } from '@playwright/test';

export interface ApiClient {
  get(path: string, params?: Record<string, string>): Promise<ApiResponse>;
  post(path: string, data?: unknown): Promise<ApiResponse>;
  postFile(path: string, filePath: string, params?: Record<string, string>): Promise<ApiResponse>;
  delete(path: string): Promise<ApiResponse>;
}

export interface ApiResponse {
  status: number;
  data: unknown;
  ok: boolean;
}

const apiBaseURL = process.env.API_BASE_URL || 'http://localhost:8000';

export const test = base.extend<{
  /** Authenticated API client for direct FastAPI calls. */
  api: ApiClient;
}>({
  api: async ({ request }, use) => {
    const client: ApiClient = {
      async get(path: string, params?: Record<string, string>): Promise<ApiResponse> {
        const url = new URL(path, apiBaseURL);
        if (params) {
          Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const response = await request.get(url.toString());
        const data = await response.json().catch(() => null);
        return { status: response.status(), data, ok: response.ok() };
      },

      async post(path: string, data?: unknown): Promise<ApiResponse> {
        const url = new URL(path, apiBaseURL);
        const response = await request.post(url.toString(), {
          data,
          headers: { 'Content-Type': 'application/json' },
        });
        const responseData = await response.json().catch(() => null);
        return { status: response.status(), data: responseData, ok: response.ok() };
      },

      async postFile(path: string, filePath: string, params?: Record<string, string>): Promise<ApiResponse> {
        const url = new URL(path, apiBaseURL);
        if (params) {
          Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const fs = await import('fs');
        const pathLib = await import('path');
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = pathLib.basename(filePath);

        const response = await request.post(url.toString(), {
          multipart: {
            file: {
              name: fileName,
              mimeType: 'text/plain',
              buffer: fileBuffer,
            },
          },
        });
        const responseData = await response.json().catch(() => null);
        return { status: response.status(), data: responseData, ok: response.ok() };
      },

      async delete(path: string): Promise<ApiResponse> {
        const url = new URL(path, apiBaseURL);
        const response = await request.delete(url.toString());
        const data = await response.json().catch(() => null);
        return { status: response.status(), data, ok: response.ok() };
      },
    };

    await use(client);
  },
});

export { expect };
