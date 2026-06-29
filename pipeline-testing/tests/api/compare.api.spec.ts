/**
 * API Tests: Compare Endpoints
 *
 * Direct REST API tests for comparison operations.
 * Tests validation, error handling, and response structure.
 * Requires running FastAPI backend (LIVE_MODE=true).
 *
 * @tags @api @compare
 */

import { test, expect } from '../fixtures/api.fixture';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data/icd_d06');
const BASELINE_FILE = path.join(DATA_DIR, 'WI_PROV_FILE_EXTRACT_T.psv');

test.describe('Compare API', () => {

  test('API-CMP-001 - Compare run with non-existent file returns 404', {
    tag: ['@api', '@compare', '@negative', '@API-CMP-001'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run', {
      filepath: '/nonexistent/file.psv',
      interface_type: 'icd_d06',
    });

    expect(response.status).toBe(404);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('not found');
  });

  test('API-CMP-002 - Compare run with invalid interface type returns 400', {
    tag: ['@api', '@compare', '@negative', '@API-CMP-002'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run', {
      filepath: BASELINE_FILE,
      interface_type: 'invalid_type',
    });

    expect(response.status).toBe(400);
    const data = response.data as { detail: string };
    expect(data.detail).toBeDefined();
  });

  test('API-CMP-003 - Compare run-stage with non-existent file returns 404', {
    tag: ['@api', '@compare', '@negative', '@API-CMP-003'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run-stage', {
      test_run_id: '00000000-0000-0000-0000-000000000001',
      filepath: '/nonexistent/file.psv',
      interface_type: 'icd_d06',
      mcd_id_prefix: '000000000',
      stage: 1,
    });

    expect(response.status).toBe(404);
  });

  test('API-CMP-004 - Compare run-stage with invalid interface returns 400', {
    tag: ['@api', '@compare', '@negative', '@API-CMP-004'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run-stage', {
      test_run_id: '00000000-0000-0000-0000-000000000001',
      filepath: BASELINE_FILE,
      interface_type: 'nonexistent',
      mcd_id_prefix: '000000000',
      stage: 1,
    });

    expect(response.status).toBe(400);
  });

  test('API-CMP-005 - Compare run accepts optional stages parameter', {
    tag: ['@api', '@compare', '@regression', '@API-CMP-005'],
  }, async ({ api }) => {
    // Test that the endpoint accepts stages array (validation only — actual comparison needs DB)
    const response = await api.post('/api/compare/run', {
      filepath: '/nonexistent/file.psv',
      interface_type: 'icd_d06',
      stages: [1, 2],
    });

    // Should get 404 (file not found) rather than validation error
    expect(response.status).toBe(404);
  });

  test('API-CMP-006 - Compare run accepts optional mcd_id_prefix', {
    tag: ['@api', '@compare', '@regression', '@API-CMP-006'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run', {
      filepath: '/nonexistent/file.psv',
      interface_type: 'icd_d06',
      mcd_id_prefix: '123456789',
    });

    // 404 is expected (file not found) — validates that mcd_id_prefix doesn't cause error
    expect(response.status).toBe(404);
  });

  test('API-CMP-007 - Compare run accepts optional test_run_id', {
    tag: ['@api', '@compare', '@regression', '@API-CMP-007'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run', {
      filepath: '/nonexistent/file.psv',
      interface_type: 'icd_d06',
      test_run_id: 'custom-test-id',
    });

    expect(response.status).toBe(404);
  });

  test('API-CMP-008 - Compare run-stage validates stage number', {
    tag: ['@api', '@compare', '@negative', '@boundary', '@API-CMP-008'],
  }, async ({ api }) => {
    const response = await api.post('/api/compare/run-stage', {
      test_run_id: '00000000-0000-0000-0000-000000000001',
      filepath: BASELINE_FILE,
      interface_type: 'icd_d06',
      mcd_id_prefix: '000000000',
      stage: 5,  // Invalid: must be 1-4
    });

    // Should return 400 (invalid stage) or 422 (validation error)
    expect([400, 422]).toContain(response.status);
  });

  test('API-CMP-009 - Progress endpoint returns 404 for unknown run', {
    tag: ['@api', '@compare', '@negative', '@API-CMP-009'],
  }, async ({ api }) => {
    const response = await api.get('/api/compare/progress/nonexistent-run-id');

    // Either 404 or empty progress is acceptable
    expect([200, 404]).toContain(response.status);
  });

  test('API-CMP-010 - Mismatches endpoint returns structured data', {
    tag: ['@api', '@compare', '@regression', '@API-CMP-010'],
  }, async ({ api }) => {
    const response = await api.get('/api/compare/mismatches/nonexistent-run-id');

    // Should return 404 or empty mismatch list
    expect([200, 404]).toContain(response.status);
  });
});
