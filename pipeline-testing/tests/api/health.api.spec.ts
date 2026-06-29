/**
 * API Tests: Health & Root Endpoints
 *
 * Direct REST API tests for service health and root info.
 * These tests run against the live FastAPI backend (LIVE_MODE=true).
 *
 * @tags @api @health
 */

import { test, expect } from '../fixtures/api.fixture';

test.describe('Health API', () => {

  test('API-HLT-001 - Root endpoint returns service info', {
    tag: ['@api', '@health', '@smoke', '@API-HLT-001'],
  }, async ({ api }) => {
    const response = await api.get('/');

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);

    const data = response.data as Record<string, unknown>;
    expect(data.service).toBe('pl-test');
    expect(data.version).toBe('0.1.0');
    expect(data.status).toBe('running');
    expect(data.database_server).toBeDefined();
    expect(data.interface_db).toBeDefined();
    expect(data.carity_db).toBeDefined();
  });

  test('API-HLT-002 - Health check returns healthy status', {
    tag: ['@api', '@health', '@smoke', '@API-HLT-002'],
  }, async ({ api }) => {
    const response = await api.get('/health');

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);

    const data = response.data as Record<string, unknown>;
    expect(data.status).toBe('healthy');
  });

  test('API-HLT-003 - Non-existent endpoint returns 404', {
    tag: ['@api', '@health', '@negative', '@API-HLT-003'],
  }, async ({ api }) => {
    const response = await api.get('/api/nonexistent');
    expect(response.status).toBe(404);
  });

  test('API-HLT-004 - Root endpoint includes database server info', {
    tag: ['@api', '@health', '@regression', '@API-HLT-004'],
  }, async ({ api }) => {
    const response = await api.get('/');
    expect(response.status).toBe(200);

    const data = response.data as Record<string, unknown>;
    expect(typeof data.database_server).toBe('string');
    expect((data.database_server as string).length).toBeGreaterThan(0);
  });
});
