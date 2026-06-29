/**
 * Mock API — Pipeline Testing
 *
 * Intercepts HTTP requests to the FastAPI backend and returns mock responses.
 * Used by ATC and UJT tests in mock mode (no live backend required).
 *
 * Mocks the REST API endpoints:
 * - GET  /health
 * - GET  /
 * - POST /api/test-runs/
 * - GET  /api/test-runs/
 * - GET  /api/test-runs/{id}
 * - POST /api/files/upload
 * - POST /api/files/parse-local
 * - POST /api/files/s3-load
 * - GET  /api/files/s3-list
 * - GET  /api/files/interfaces
 * - GET  /api/files/infer-interface
 * - POST /api/compare/run
 * - POST /api/cleanup/{id}
 * - DELETE /api/cleanup/{id}
 */

import { Page, Route } from '@playwright/test';
import {
  createHealthResponse,
  createRootResponse,
  createParseSummary,
  createCompareResponse,
  createCleanupResponse,
  createTestRunData,
} from './test-data';

export interface MockedEndpoint {
  method: string;
  pathPattern: RegExp;
  response: unknown;
  status?: number;
}

export interface InterceptedRequest {
  method: string;
  url: string;
  body?: unknown;
  timestamp: number;
}

export class MockApi {
  private page: Page;
  private mocks: MockedEndpoint[] = [];
  private interceptedRequests: InterceptedRequest[] = [];
  private apiBaseUrl: string;

  constructor(page: Page, apiBaseUrl = 'http://localhost:8000') {
    this.page = page;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Set up default mock responses for all API endpoints.
   * Call this in test setup to have a working mock backend.
   */
  async setupDefaults(): Promise<void> {
    // Health & root
    this.mockEndpoint('GET', /\/health$/, createHealthResponse());
    this.mockEndpoint('GET', /^\/$/, createRootResponse());

    // Test runs
    this.mockEndpoint('POST', /\/api\/test-runs\/?$/, {
      test_run_id: 'mock-run-001',
      interface_type: 'icd_d06',
      start_timestamp: new Date().toISOString(),
      source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      mcd_id_prefix: '000000000',
      overall_status: 'PENDING',
      cleaned_up: false,
    });
    this.mockEndpoint('GET', /\/api\/test-runs\/?$/, []);
    this.mockEndpoint('GET', /\/api\/test-runs\/[^/]+$/, {
      test_run_id: 'mock-run-001',
      interface_type: 'icd_d06',
      start_timestamp: new Date().toISOString(),
      source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      mcd_id_prefix: '000000000',
      overall_status: 'PASS',
      cleaned_up: false,
    });

    // Files
    this.mockEndpoint('POST', /\/api\/files\/upload$/, createParseSummary());
    this.mockEndpoint('POST', /\/api\/files\/parse-local$/, createParseSummary());
    this.mockEndpoint('POST', /\/api\/files\/s3-load$/, createParseSummary());
    this.mockEndpoint('GET', /\/api\/files\/s3-list$/, {
      files: ['WI_PROV_FILE_EXTRACT_T.psv', 'WI_PROV_FILE_EXTRACT_T_02.psv'],
      cached: false,
    });
    this.mockEndpoint('GET', /\/api\/files\/interfaces$/, {
      interfaces: [
        { interface_type: 'icd_d06', display_name: 'ICD-D06 Medicaid Provider', file_extensions: ['.psv'], description: 'Provider file' },
        { interface_type: 'icd_d12', display_name: 'ICD-D12 FSIA Functional Screen', file_extensions: ['.txt'], description: 'FSIA file' },
      ],
    });
    this.mockEndpoint('GET', /\/api\/files\/infer-interface/, {
      interface_type: 'icd_d06',
      display_name: 'ICD-D06 Medicaid Provider',
      match_method: 'filename_prefix',
    });
    this.mockEndpoint('GET', /\/api\/files\/cached$/, {});

    // Compare
    this.mockEndpoint('POST', /\/api\/compare\/run$/, createCompareResponse());
    this.mockEndpoint('POST', /\/api\/compare\/run-stage$/, {
      stage: 1,
      total_checks: 49,
      pass_count: 49,
      fail_count: 0,
      missing_count: 0,
    });
    this.mockEndpoint('GET', /\/api\/compare\/mismatches\//, { mismatches: [], total: 0 });
    this.mockEndpoint('GET', /\/api\/compare\/summary\//, createCompareResponse());

    // Cleanup
    this.mockEndpoint('POST', /\/api\/cleanup\/pipeline\//, {
      entity_id_prefix: '000000000',
      stages_cleaned: '1, 2, 3, 4',
      message: 'All pipeline data removed.',
    });
    this.mockEndpoint('POST', /\/api\/cleanup\/test-data\/all$/, {
      total_deleted: 150,
      message: 'All TestVerification data removed.',
    });
    this.mockEndpoint('POST', /\/api\/cleanup\/[^/]+$/, createCleanupResponse('mock-run-001'));
    this.mockEndpoint('DELETE', /\/api\/cleanup\/[^/]+$/, createCleanupResponse('mock-run-001'));

    // Register route handler
    await this.page.route(`${this.apiBaseUrl}/**`, (route) => this.handleRoute(route));
  }

  /**
   * Register a mock endpoint.
   */
  mockEndpoint(method: string, pathPattern: RegExp, response: unknown, status = 200): void {
    // Remove existing mock for same method+pattern
    this.mocks = this.mocks.filter(
      (m) => !(m.method === method && m.pathPattern.source === pathPattern.source),
    );
    this.mocks.push({ method, pathPattern, response, status });
  }

  /**
   * Register a mock endpoint that returns an error.
   */
  mockEndpointError(method: string, pathPattern: RegExp, errorMessage: string, status = 500): void {
    this.mockEndpoint(method, pathPattern, { detail: errorMessage }, status);
  }

  /**
   * Get all intercepted requests.
   */
  getInterceptedRequests(): InterceptedRequest[] {
    return this.interceptedRequests;
  }

  /**
   * Clear all mocks and intercepted requests.
   */
  clearMocks(): void {
    this.mocks = [];
    this.interceptedRequests = [];
  }

  private async handleRoute(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;

    // Record the intercepted request
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = request.postData();
    }
    this.interceptedRequests.push({ method, url: request.url(), body, timestamp: Date.now() });

    // Find matching mock
    const mock = this.mocks.find(
      (m) => m.method === method && m.pathPattern.test(pathname),
    );

    if (mock) {
      await route.fulfill({
        status: mock.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(mock.response),
      });
    } else {
      // Let unmatched requests pass through (or return 404)
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: `No mock for ${method} ${pathname}` }),
      });
    }
  }
}

export const isLiveMode = process.env.LIVE_MODE === 'true';
