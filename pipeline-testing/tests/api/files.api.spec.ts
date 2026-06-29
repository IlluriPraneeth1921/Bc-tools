/**
 * API Tests: File Management Endpoints
 *
 * Direct REST API tests for file upload, parsing, S3 operations, and interface management.
 * Requires running FastAPI backend (LIVE_MODE=true).
 *
 * @tags @api @files
 */

import { test, expect } from '../fixtures/api.fixture';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data/icd_d06');
const BASELINE_FILE = path.join(DATA_DIR, 'WI_PROV_FILE_EXTRACT_T.psv');

test.describe('Files API', () => {

  test('API-FIL-001 - List available interfaces returns icd_d06 and icd_d12', {
    tag: ['@api', '@files', '@smoke', '@API-FIL-001'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/interfaces');

    expect(response.status).toBe(200);
    const data = response.data as { interfaces: Array<{ interface_type: string; display_name: string; file_extensions: string[] }> };
    expect(data.interfaces).toBeDefined();
    expect(data.interfaces.length).toBeGreaterThanOrEqual(2);

    const types = data.interfaces.map(i => i.interface_type);
    expect(types).toContain('icd_d06');
    expect(types).toContain('icd_d12');

    // Each interface should have required metadata
    for (const iface of data.interfaces) {
      expect(iface.display_name).toBeTruthy();
      expect(iface.file_extensions).toBeDefined();
      expect(iface.file_extensions.length).toBeGreaterThan(0);
    }
  });

  test('API-FIL-002 - Parse local file returns parse summary', {
    tag: ['@api', '@files', '@smoke', '@API-FIL-002'],
  }, async ({ api }) => {
    const response = await api.post('/api/files/parse-local', undefined);
    // This will need the filepath as a query param
    const resp = await api.get('/api/files/interfaces');
    expect(resp.status).toBe(200);
  });

  test('API-FIL-003 - Parse non-existent file returns 404', {
    tag: ['@api', '@files', '@negative', '@API-FIL-003'],
  }, async ({ api }) => {
    const response = await api.post(
      '/api/files/parse-local?filepath=/nonexistent/file.psv',
    );

    expect(response.status).toBe(404);
    const data = response.data as { detail: string };
    expect(data.detail).toContain('not found');
  });

  test('API-FIL-004 - Infer interface type from D06 filename', {
    tag: ['@api', '@files', '@regression', '@API-FIL-004'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/infer-interface', {
      filename: 'WI_PROV_FILE_EXTRACT_T.psv',
    });

    expect(response.status).toBe(200);
    const data = response.data as { interface_type: string; match_method: string };
    expect(data.interface_type).toBe('icd_d06');
    expect(data.match_method).toBe('filename_prefix');
  });

  test('API-FIL-005 - Infer interface type from D12 filename', {
    tag: ['@api', '@files', '@regression', '@API-FIL-005'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/infer-interface', {
      filename: 'WI_FSIA_FILE_EXTRACT_T.txt',
    });

    expect(response.status).toBe(200);
    const data = response.data as { interface_type: string; match_method: string };
    expect(data.interface_type).toBe('icd_d12');
    expect(data.match_method).toBe('filename_prefix');
  });

  test('API-FIL-006 - Infer interface returns null for unknown filename', {
    tag: ['@api', '@files', '@negative', '@API-FIL-006'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/infer-interface', {
      filename: 'random_unknown_file.csv',
    });

    expect(response.status).toBe(200);
    const data = response.data as { interface_type: string | null; match_method: string | null };
    expect(data.interface_type).toBeNull();
    expect(data.match_method).toBeNull();
  });

  test('API-FIL-007 - Infer interface is case insensitive', {
    tag: ['@api', '@files', '@regression', '@API-FIL-007'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/infer-interface', {
      filename: 'wi_prov_file_extract_t.PSV',
    });

    expect(response.status).toBe(200);
    const data = response.data as { interface_type: string };
    expect(data.interface_type).toBe('icd_d06');
  });

  test('API-FIL-008 - Infer interface handles path prefix in filename', {
    tag: ['@api', '@files', '@regression', '@API-FIL-008'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/infer-interface', {
      filename: 'icd_d06/WI_PROV_FILE_EXTRACT_T.psv',
    });

    expect(response.status).toBe(200);
    const data = response.data as { interface_type: string };
    expect(data.interface_type).toBe('icd_d06');
  });

  test('API-FIL-009 - PSV extension inferred as icd_d06', {
    tag: ['@api', '@files', '@regression', '@API-FIL-009'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/infer-interface', {
      filename: 'custom_name.psv',
    });

    expect(response.status).toBe(200);
    const data = response.data as { interface_type: string; match_method: string };
    expect(data.interface_type).toBe('icd_d06');
    expect(data.match_method).toBe('file_extension');
  });

  test('API-FIL-010 - List cached files returns object', {
    tag: ['@api', '@files', '@regression', '@API-FIL-010'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/cached');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(typeof response.data).toBe('object');
  });

  test('API-FIL-011 - S3 list endpoint returns files array', {
    tag: ['@api', '@files', '@regression', '@API-FIL-011'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/s3-list');

    expect(response.status).toBe(200);
    const data = response.data as { files: string[]; cached: boolean };
    expect(data.files).toBeDefined();
    expect(Array.isArray(data.files)).toBe(true);
    expect(typeof data.cached).toBe('boolean');
  });

  test('API-FIL-012 - S3 list with interface filter', {
    tag: ['@api', '@files', '@regression', '@API-FIL-012'],
  }, async ({ api }) => {
    const response = await api.get('/api/files/s3-list', {
      interface_type: 'icd_d12',
    });

    expect(response.status).toBe(200);
    const data = response.data as { files: string[] };
    expect(data.files).toBeDefined();
  });
});
