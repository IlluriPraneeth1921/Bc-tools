/**
 * Test Data Factories — Pipeline Testing
 *
 * Generates test data for ATCs and UJTs.
 * Uses AutoTest_ prefix convention for data isolation.
 */

export interface TestRunData {
  test_run_id: string;
  interface_type: string;
  source_filename: string;
  mcd_id_prefix: string;
}

export interface ParseSummaryData {
  filename: string;
  total_lines: number;
  total_providers: number;
  record_count: number;
  provider_ids: string[];
  provider_names: Array<{ mcd_id: string; provider_name: string }>;
  record_types_found: string[];
}

export interface CompareResponseData {
  test_run_id: string;
  filename: string;
  status: string;
  total_providers: number;
  total_source_lines: number;
  stages: Array<{
    stage: number;
    total_checks: number;
    pass_count: number;
    fail_count: number;
    missing_count: number;
  }>;
  total_checks: number;
  total_pass: number;
  total_fail: number;
  total_missing: number;
}

export interface CleanupResponseData {
  test_run_id: string;
  message: string;
}

export interface HealthResponseData {
  status: string;
}

export interface RootResponseData {
  service: string;
  version: string;
  status: string;
  database_server: string;
  interface_db: string;
  carity_db: string;
}

// ─── Factory Functions ───────────────────────────────────────────────────────

export function createTestRunData(overrides?: Partial<TestRunData>): TestRunData {
  return {
    test_run_id: `AutoTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    interface_type: 'icd_d06',
    source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
    mcd_id_prefix: '000000000',
    ...overrides,
  };
}

export function createParseSummary(overrides?: Partial<ParseSummaryData>): ParseSummaryData {
  return {
    filename: 'WI_PROV_FILE_EXTRACT_T.psv',
    total_lines: 52,
    total_providers: 3,
    record_count: 49,
    provider_ids: ['000000000012345', '000000000067890', '000000000011111'],
    provider_names: [
      { mcd_id: '000000000012345', provider_name: 'TEST PROVIDER ONE' },
      { mcd_id: '000000000067890', provider_name: 'TEST PROVIDER TWO' },
      { mcd_id: '000000000011111', provider_name: 'TEST PROVIDER THREE' },
    ],
    record_types_found: ['00', '01', '02', '03', '04', '05', '06', '07', '09'],
    ...overrides,
  };
}

export function createCompareResponse(overrides?: Partial<CompareResponseData>): CompareResponseData {
  return {
    test_run_id: `AutoTest_${Date.now()}`,
    filename: 'WI_PROV_FILE_EXTRACT_T.psv',
    status: 'PASS',
    total_providers: 3,
    total_source_lines: 52,
    stages: [
      { stage: 1, total_checks: 49, pass_count: 49, fail_count: 0, missing_count: 0 },
      { stage: 2, total_checks: 120, pass_count: 118, fail_count: 2, missing_count: 0 },
      { stage: 3, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
      { stage: 4, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
    ],
    total_checks: 359,
    total_pass: 357,
    total_fail: 2,
    total_missing: 0,
    ...overrides,
  };
}

export function createCleanupResponse(testRunId: string): CleanupResponseData {
  return {
    test_run_id: testRunId,
    message: 'Test run cleaned up successfully.',
  };
}

export function createHealthResponse(): HealthResponseData {
  return { status: 'healthy' };
}

export function createRootResponse(): RootResponseData {
  return {
    service: 'pl-test',
    version: '0.1.0',
    status: 'running',
    database_server: 'localhost',
    interface_db: 'WiDHS.Qc.Interface.Carity.ToolTesting',
    carity_db: 'WiDHS.Qc.Carity.ToolTestig',
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export const dataUtils = {
  uniqueName: (base: string) => `AutoTest_${base}_${Date.now()}`,
  uniquePrefix: () => `9999${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
  today: () => new Date().toISOString().split('T')[0],
  timestamp: () => Date.now().toString(),
};
