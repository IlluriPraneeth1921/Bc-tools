/**
 * API Tests: Cleanup Endpoints
 *
 * Direct REST API tests for data cleanup operations.
 * Tests per-run cleanup, pipeline data cleanup, and validation.
 * Requires running FastAPI backend (LIVE_MODE=true).
 *
 * @tags @api @cleanup
 */

import { test, expect } from '../fixtures/api.fixture';

test.describe('Cleanup API', () => {

  test('API-CLN-001 - Cleanup non-existent test run returns 404', {
    tag: ['@api', '@cleanup', '@negative', '@API-CLN-001'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/00000000-0000-0000-0000-nonexistent');

    expect(response.status).toBe(404);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('not found');
  });

  test('API-CLN-002 - Delete non-existent test run returns 404', {
    tag: ['@api', '@cleanup', '@negative', '@API-CLN-002'],
  }, async ({ api }) => {
    const response = await api.delete('/api/cleanup/00000000-0000-0000-0000-nonexistent');

    expect(response.status).toBe(404);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('not found');
  });

  test('API-CLN-003 - Pipeline cleanup with short prefix returns 400', {
    tag: ['@api', '@cleanup', '@negative', '@validation', '@API-CLN-003'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/all', {
      entity_id_prefix: '123',  // Too short (< 5 chars)
    });

    expect(response.status).toBe(400);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('at least 5 characters');
  });

  test('API-CLN-004 - Pipeline cleanup (interface) with short prefix returns 400', {
    tag: ['@api', '@cleanup', '@negative', '@validation', '@API-CLN-004'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/interface', {
      entity_id_prefix: 'AB',  // Too short
    });

    expect(response.status).toBe(400);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('at least 5 characters');
  });

  test('API-CLN-005 - Pipeline cleanup (carity) with short prefix returns 400', {
    tag: ['@api', '@cleanup', '@negative', '@validation', '@API-CLN-005'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/carity', {
      entity_id_prefix: '1',  // Too short
    });

    expect(response.status).toBe(400);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('at least 5 characters');
  });

  test('API-CLN-006 - Pipeline cleanup (all) with valid prefix returns success', {
    tag: ['@api', '@cleanup', '@smoke', '@API-CLN-006'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/all', {
      entity_id_prefix: '999999999',  // Test prefix — safe to clean
    });

    expect(response.status).toBe(200);
    const data = response.data as {
      entity_id_prefix: string;
      stages_cleaned: string;
      message: string;
    };
    expect(data.entity_id_prefix).toBe('999999999');
    expect(data.stages_cleaned).toContain('1');
    expect(data.stages_cleaned).toContain('4');
    expect(data.message).toBeDefined();
  });

  test('API-CLN-007 - Pipeline cleanup (interface only) returns stages 1-3', {
    tag: ['@api', '@cleanup', '@regression', '@API-CLN-007'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/interface', {
      entity_id_prefix: '999999999',
    });

    expect(response.status).toBe(200);
    const data = response.data as { stages_cleaned: string };
    expect(data.stages_cleaned).toContain('1');
    expect(data.stages_cleaned).toContain('2');
    expect(data.stages_cleaned).toContain('3');
    expect(data.stages_cleaned).not.toContain('4');
  });

  test('API-CLN-008 - Pipeline cleanup (carity only) returns stage 4', {
    tag: ['@api', '@cleanup', '@regression', '@API-CLN-008'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/carity', {
      entity_id_prefix: '999999999',
    });

    expect(response.status).toBe(200);
    const data = response.data as { stages_cleaned: string };
    expect(data.stages_cleaned).toBe('4');
  });

  test('API-CLN-009 - Bulk test data cleanup returns total deleted count', {
    tag: ['@api', '@cleanup', '@regression', '@API-CLN-009'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/test-data/all');

    expect(response.status).toBe(200);
    const data = response.data as { total_deleted: number; message: string };
    expect(typeof data.total_deleted).toBe('number');
    expect(data.total_deleted).toBeGreaterThanOrEqual(0);
    expect(data.message).toBeDefined();
  });

  test('API-CLN-010 - Cleanup with interface_type filter', {
    tag: ['@api', '@cleanup', '@regression', '@API-CLN-010'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/all', {
      entity_id_prefix: '999999999',
      interface_type: 'icd_d06',
    });

    expect(response.status).toBe(200);
    const data = response.data as { message: string };
    expect(data.message).toBeDefined();
  });

  test('API-CLN-011 - Empty prefix string returns 400', {
    tag: ['@api', '@cleanup', '@negative', '@boundary', '@API-CLN-011'],
  }, async ({ api }) => {
    const response = await api.post('/api/cleanup/pipeline/all', {
      entity_id_prefix: '',
    });

    expect(response.status).toBe(400);
  });

  test('API-CLN-012 - Cleanup created test run succeeds', {
    tag: ['@api', '@cleanup', '@regression', '@API-CLN-012'],
  }, async ({ api }) => {
    // Create a test run first
    const createResp = await api.post('/api/test-runs/', {
      interface_type: 'icd_d06',
      source_filename: 'AutoTest_cleanup_test.psv',
      mcd_id_prefix: '999999999',
    });
    expect(createResp.status).toBe(200);
    const created = createResp.data as { test_run_id: string };

    // Cleanup the created run
    const response = await api.post(`/api/cleanup/${created.test_run_id}`);

    expect(response.status).toBe(200);
    const data = response.data as { test_run_id: string; message: string };
    expect(data.test_run_id).toBe(created.test_run_id);
    expect(data.message).toContain('cleaned up');
  });
});
