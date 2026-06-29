/**
 * API Tests: Test Runs Endpoints
 *
 * Direct REST API tests for test run CRUD operations.
 * Requires running FastAPI backend (LIVE_MODE=true).
 *
 * @tags @api @test-runs
 */

import { test, expect } from '../fixtures/api.fixture';

test.describe('Test Runs API', () => {

  test('API-TRN-001 - List test runs returns array', {
    tag: ['@api', '@test-runs', '@smoke', '@API-TRN-001'],
  }, async ({ api }) => {
    const response = await api.get('/api/test-runs/');

    expect(response.status).toBe(200);
    const data = response.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('API-TRN-002 - List test runs with limit parameter', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-002'],
  }, async ({ api }) => {
    const response = await api.get('/api/test-runs/', { limit: '5' });

    expect(response.status).toBe(200);
    const data = response.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(5);
  });

  test('API-TRN-003 - List test runs with interface_type filter', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-003'],
  }, async ({ api }) => {
    const response = await api.get('/api/test-runs/', { interface_type: 'icd_d06' });

    expect(response.status).toBe(200);
    const data = response.data as Array<{ interface_type: string }>;
    expect(Array.isArray(data)).toBe(true);
    // All returned runs should be of the requested type
    for (const run of data) {
      expect(run.interface_type).toBe('icd_d06');
    }
  });

  test('API-TRN-004 - Create test run returns new run with ID', {
    tag: ['@api', '@test-runs', '@smoke', '@API-TRN-004'],
  }, async ({ api }) => {
    const response = await api.post('/api/test-runs/', {
      interface_type: 'icd_d06',
      source_filename: 'AutoTest_playwright_api.psv',
      mcd_id_prefix: '999999999',
    });

    expect(response.status).toBe(200);
    const data = response.data as {
      test_run_id: string;
      interface_type: string;
      source_filename: string;
      mcd_id_prefix: string;
      overall_status: string;
    };
    expect(data.test_run_id).toBeDefined();
    expect(data.test_run_id.length).toBeGreaterThan(0);
    expect(data.interface_type).toBe('icd_d06');
    expect(data.source_filename).toBe('AutoTest_playwright_api.psv');
    expect(data.mcd_id_prefix).toBe('999999999');
    expect(data.overall_status).toBe('PENDING');
  });

  test('API-TRN-005 - Get specific test run by ID', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-005'],
  }, async ({ api }) => {
    // First create a test run
    const createResp = await api.post('/api/test-runs/', {
      interface_type: 'icd_d06',
      source_filename: 'AutoTest_get_by_id.psv',
      mcd_id_prefix: '999999999',
    });
    expect(createResp.status).toBe(200);
    const created = createResp.data as { test_run_id: string };

    // Then retrieve it
    const response = await api.get(`/api/test-runs/${created.test_run_id}`);

    expect(response.status).toBe(200);
    const data = response.data as { test_run_id: string; source_filename: string };
    expect(data.test_run_id).toBe(created.test_run_id);
    expect(data.source_filename).toBe('AutoTest_get_by_id.psv');
  });

  test('API-TRN-006 - Get non-existent test run returns 404', {
    tag: ['@api', '@test-runs', '@negative', '@API-TRN-006'],
  }, async ({ api }) => {
    const response = await api.get('/api/test-runs/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('not found');
  });

  test('API-TRN-007 - Create test run with pre-generated ID', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-007'],
  }, async ({ api }) => {
    const testRunId = `AutoTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const response = await api.post('/api/test-runs/create', {
      test_run_id: testRunId,
      interface_type: 'icd_d06',
      filepath: 'AutoTest_with_id.psv',
      mcd_id_prefix: '999999999',
    });

    expect(response.status).toBe(200);
    const data = response.data as { test_run_id: string; status: string };
    expect(data.test_run_id).toBe(testRunId);
    expect(data.status).toBe('created');
  });

  test('API-TRN-008 - Finalize test run updates status', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-008'],
  }, async ({ api }) => {
    // Create a test run first
    const testRunId = `AutoTest_finalize_${Date.now()}`;
    await api.post('/api/test-runs/create', {
      test_run_id: testRunId,
      interface_type: 'icd_d06',
      filepath: 'AutoTest_finalize.psv',
      mcd_id_prefix: '999999999',
    });

    // Finalize it
    const response = await api.post('/api/test-runs/finalize', {
      test_run_id: testRunId,
      overall_status: 'PASS',
      stage_results: [
        { stage: 1, pass_count: 49, fail_count: 0, missing_count: 0 },
        { stage: 2, pass_count: 120, fail_count: 0, missing_count: 0 },
        { stage: 3, pass_count: 95, fail_count: 0, missing_count: 0 },
        { stage: 4, pass_count: 95, fail_count: 0, missing_count: 0 },
      ],
    });

    expect(response.status).toBe(200);
    const data = response.data as { test_run_id: string; status: string };
    expect(data.test_run_id).toBe(testRunId);
    expect(data.status).toBe('finalized');
  });

  test('API-TRN-009 - Test run response contains stage counts', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-009'],
  }, async ({ api }) => {
    const response = await api.get('/api/test-runs/', { limit: '1' });
    expect(response.status).toBe(200);

    const data = response.data as Array<Record<string, unknown>>;
    if (data.length > 0) {
      const run = data[0];
      // Verify stage count fields exist
      expect('stage1_pass_count' in run).toBe(true);
      expect('stage1_fail_count' in run).toBe(true);
      expect('stage2_pass_count' in run).toBe(true);
      expect('stage2_fail_count' in run).toBe(true);
      expect('stage3_pass_count' in run).toBe(true);
      expect('stage3_fail_count' in run).toBe(true);
      expect('stage4_pass_count' in run).toBe(true);
      expect('stage4_fail_count' in run).toBe(true);
      expect('overall_status' in run).toBe(true);
    }
  });

  test('API-TRN-010 - Test run list is sorted by most recent first', {
    tag: ['@api', '@test-runs', '@regression', '@API-TRN-010'],
  }, async ({ api }) => {
    const response = await api.get('/api/test-runs/', { limit: '10' });
    expect(response.status).toBe(200);

    const data = response.data as Array<{ start_timestamp: string }>;
    if (data.length >= 2) {
      const first = new Date(data[0].start_timestamp).getTime();
      const second = new Date(data[1].start_timestamp).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });
});
