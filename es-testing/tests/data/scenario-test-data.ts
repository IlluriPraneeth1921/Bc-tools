/**
 * Centralized Test Data — Enrollment Service Scenario Diagrams
 *
 * Source: docs/Enrollment_Service_Scenario_Diagrams.md
 * All dates and expected values for each test case scenario.
 *
 * Usage:
 *   import { SCENARIOS } from '../../data/scenario-test-data';
 *   const data = SCENARIOS.TC_001; // or SCENARIOS.TC_002, etc.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MmisSpan {
  label: string;        // e.g. "Span-A", "Span-B", "Span-C"
  status: 'A' | 'S' | 'I';  // Active, Suspended, Inactive
  beginDate: string;    // MM/DD/YYYY format for UI input
  endDate: string;      // MM/DD/YYYY format for UI input
  agency?: string;      // ICA/FEA identifier if relevant
}

export interface MmisTransaction {
  sequence: number;
  scenario: string;     // e.g. "S300", "S310", "S500"
  type: 'O' | 'C' | 'A'; // Open, Closure, Add (SDPC)
  status: 'A' | 'S' | 'I';
  startReason?: string;
  stopReason?: string;
  description: string;
}

export interface ScenarioData {
  testCaseId: string;
  scenarioId: string;
  title: string;
  program: 'IRIS' | 'SDPC';
  decisionTablePath: string;
  transactionCount: number;
  expectedResponse: 'SU' | 'SE' | 'FL' | 'NONE';

  /** BC input data — what the user enters/changes */
  bcInput: {
    enrollmentStartDate: string;
    enrollmentEndDate: string;
    newEnrollmentStartDate?: string;
    newEnrollmentEndDate?: string;
    suspensionStartDate?: string;
    suspensionEndDate?: string;
    newSuspensionStartDate?: string;
    newSuspensionEndDate?: string | null;
    statusChange?: string;
    statusReason?: string;
    /** For create-enrollment flows (TC-001, TC-004, TC-005, TC-009, TC-015, TC-029, TC-030) */
    enrollmentStatus?: string;
    /** Specific disenrollment/status reason code for reason-code tests (TC-033) */
    disenrollmentReason?: string;
    agencyChange?: { oldAgency: string; newAgency: string; effectiveDate: string };
  };

  /** MMIS state before the test action */
  mmisBefore: MmisSpan[];

  /** Expected MMIS state after sync completes */
  mmisAfter: MmisSpan[];

  /** Expected MMIS transactions in order */
  transactions: MmisTransaction[];
}

// ─── Scenario Data ────────────────────────────────────────────────────────────

export const SCENARIOS: Record<string, ScenarioData> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-001: New IRIS Enrollment (S220_001)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_001: {
    testCaseId: 'TC-001',
    scenarioId: 'S220_001_IRIS',
    title: 'New IRIS Enrollment — Happy Path',
    program: 'IRIS',
    decisionTablePath: 'S100(1)→S200→S220(1)→S300',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create new enrollment span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-002: Enrolled → Suspended with end date (S240_001)
  // The suspensionEndDate is not generally populated. 
  // ═══════════════════════════════════════════════════════════════════════════
  TC_002: {
    testCaseId: 'TC-002',
    scenarioId: 'S240_001_IRIS',
    title: 'Enrolled → Suspended (Bounded)',
    program: 'IRIS',
    decisionTablePath: 'S100(3)→S200→S240(1)→S500+S510+S520',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/15/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S500', type: 'C', status: 'A', startReason: '2I', stopReason: '2I', description: 'Close Span-A before suspension' },
      { sequence: 2, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Add suspension span (Span-B)' },
      { sequence: 3, scenario: 'S520', type: 'O', status: 'A', startReason: '2Q', description: 'Create post-suspension span (Span-C)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-003: ICA Transfer — Active Span (S250_001)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_003: {
    testCaseId: 'TC-003',
    scenarioId: 'S250_001_IRIS',
    title: 'ICA Transfer — Close Old + Open New Span',
    program: 'IRIS',
    decisionTablePath: 'S100(6)→S200→S250(1)→S600+S255(2)→S610',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      agencyChange: { oldAgency: 'First Person Care Consultants', newAgency: 'TMG (The Management Group)', effectiveDate: '07/13/2026' },
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299', agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026', agency: 'ICA-001' },
      { label: 'Span-C', status: 'A', beginDate: '10/01/2026', endDate: '12/31/2299', agency: 'ICA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'A', startReason: '2P', stopReason: '2P', description: 'Close span with old ICA' },
      { sequence: 2, scenario: 'S610', type: 'O', status: 'A', startReason: '2P', description: 'Create span with new ICA' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-004: Hard Error — FEA Dates (S220_001 with invalid FEA)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_004: {
    testCaseId: 'TC-004',
    scenarioId: 'S220_001_IRIS_ERROR',
    title: 'Hard Error — FEA Dates Don\'t Span Enrollment',
    program: 'IRIS',
    decisionTablePath: 'S100(1)→S200→S220(1)→S300',
    transactionCount: 1,
    expectedResponse: 'FL',
    bcInput: {
      enrollmentStartDate: '01/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [], // No span created — rejected
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Attempt create — rejected by MMIS (9156)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-005: Medicaid ID Mismatch (S220_001 with ID swap)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_005: {
    testCaseId: 'TC-005',
    scenarioId: 'S220_001_IRIS_IDSWAP',
    title: 'Medicaid ID Mismatch — MMIS Returns Different ID',
    program: 'IRIS',
    decisionTablePath: 'S100(1)→S200→S220(1)→S300',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create enrollment — SU with different ID returned' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-006: End Date Earlier — Disenrollment (S220_004)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_006: {
    testCaseId: 'TC-006',
    scenarioId: 'S220_004_IRIS',
    title: 'Enrollment End Date Changed to Earlier (Disenrollment)',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(4)→S340',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '07/15/2026',
      enrollmentEndDate: '12/31/2299',
      newEnrollmentEndDate: '09/30/2026',
      statusChange: 'Disenrolled',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '07/15/2026', endDate: '09/30/2026' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S340', type: 'C', status: 'A', startReason: '2W', stopReason: '2W', description: 'Shorten end date via Closure (disenrollment)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-007: End Date Later — Extension (S220_005a)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_007: {
    testCaseId: 'TC-007',
    scenarioId: 'S220_005a_IRIS',
    title: 'Enrollment End Date Changed to Later (Extension)',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(5)→S350(2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '09/30/2026',
      newEnrollmentEndDate: '08/31/2026',
      statusChange: 'Enrolled',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '08/31/2026' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S350', type: 'O', status: 'A', startReason: '2L', description: 'Extend end date (reopen enrollment)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-008: Referral Withdrawn (S220_006)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_008: {
    testCaseId: 'TC-008',
    scenarioId: 'S220_006_IRIS',
    title: 'Enrollment Deleted (Referral Withdrawn)',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(6)→S310',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      statusChange: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [], // No spans remain
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete enrollment span (inactivate)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-009: Disenrolled → Enrolled Reinstatement (S220_007)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_009: {
    testCaseId: 'TC-009',
    scenarioId: 'S220_007_IRIS',
    title: 'Disenrolled → Enrolled (Reinstatement)',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(7)→S300',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '10/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusChange: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [], // Disenrolled — no MMIS span
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '10/01/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create new enrollment span (reinstatement)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-010: Open-Ended Suspension (S240_002)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_010: {
    testCaseId: 'TC-010',
    scenarioId: 'S240_002_IRIS',
    title: 'New Suspension Added (No End Date)',
    program: 'IRIS',
    decisionTablePath: 'S100(3)→S200→S240(2)→S500+S510',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '06/15/2026',
      suspensionEndDate: undefined,  // No end date — open-ended
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '06/14/2026' },
      { label: 'Span-B', status: 'S', beginDate: '06/15/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S500', type: 'C', status: 'A', startReason: '2I', stopReason: '2I', description: 'Close Span-A before suspension' },
      { sequence: 2, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Add open-ended suspension span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-011: Suspension Too Short (S240_003 — no transaction)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_011: {
    testCaseId: 'TC-011',
    scenarioId: 'S240_003_IRIS',
    title: 'Suspension < 3 Days (Error — No Transaction)',
    program: 'IRIS',
    decisionTablePath: 'S100(3)→S200→S240(3)→⛔',
    transactionCount: 0,
    expectedResponse: 'NONE',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/02/2026', // Only 1 day — too short
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' }, // Unchanged
    ],
    transactions: [], // No transactions sent
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-012: Suspension Deleted (S230_005)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_012: {
    testCaseId: 'TC-012',
    scenarioId: 'S230_005_IRIS',
    title: 'Suspension Deleted',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(5)→S410+S470',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '08/15/2026',
      suspensionEndDate: '09/14/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '08/15/2026' },
      { label: 'Span-B', status: 'S', beginDate: '08/16/2026', endDate: '09/13/2026' },
      { label: 'Span-C', status: 'A', beginDate: '09/14/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '09/13/2026' },
      { label: 'Span-C', status: 'A', beginDate: '09/14/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S410', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete Span-B (suspension)' },
      { sequence: 2, scenario: 'S470', type: 'O', status: 'A', startReason: '2Q', description: 'Extend Span-A end date to fill gap' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-013: Suspension End Date Null → Valid (S230_006)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_013: {
    testCaseId: 'TC-013',
    scenarioId: 'S230_006_IRIS',
    title: 'Suspension End Date: Null → Valid',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(6)→S440+S520',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      newSuspensionEndDate: '07/10/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/10/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/11/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S440', type: 'C', status: 'S', startReason: '2Q', stopReason: '2W', description: 'Shorten Span-B end date' },
      { sequence: 2, scenario: 'S520', type: 'O', status: 'A', startReason: '2Q', description: 'Create Span-C (post-suspension)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-014: Address-Only Update (S700)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_014: {
    testCaseId: 'TC-014',
    scenarioId: 'S700_001_IRIS',
    title: 'Address-Only Update (Current Span Exists)',
    program: 'IRIS',
    decisionTablePath: 'S100(11)→S200→S700(1)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S700', type: 'O', status: 'A', description: 'Address-only update on current span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-015: New SDPC Enrollment (S220_001_SDPC)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_015: {
    testCaseId: 'TC-015',
    scenarioId: 'S220_001_SDPC',
    title: 'New SDPC Enrollment',
    program: 'SDPC',
    decisionTablePath: 'S100(7)→S210→S220(1)→S300(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'A', status: 'A', description: 'Create new SDPC enrollment span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-016: FEA Transfer (S250_001 with FEA)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_016: {
    testCaseId: 'TC-016',
    scenarioId: 'S250_001_IRIS_FEA',
    title: 'FEA Transfer — Close + Open',
    program: 'IRIS',
    decisionTablePath: 'S100(5)→S200→S250(1)→S600+S255(2)→S610',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      agencyChange: { oldAgency: 'FEA-001', newAgency: 'FEA-002', effectiveDate: '10/01/2026' },
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299', agency: 'FEA-001' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026', agency: 'FEA-001' },
      { label: 'Span-C', status: 'A', beginDate: '10/01/2026', endDate: '12/31/2299', agency: 'FEA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'A', startReason: '2R', stopReason: '2R', description: 'Close span with old FEA' },
      { sequence: 2, scenario: 'S610', type: 'O', status: 'A', startReason: '2R', description: 'Create span with new FEA' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-017: ICA Transfer During Suspension (S250_002)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_017: {
    testCaseId: 'TC-017',
    scenarioId: 'S250_002_IRIS',
    title: 'ICA Transfer During Suspension',
    program: 'IRIS',
    decisionTablePath: 'S100(6)→S200→S250(2)→S600(2)+S255(3/4+2)→S620+S610',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/14/2026',
      agencyChange: { oldAgency: 'ICA-001', newAgency: 'ICA-002', effectiveDate: '08/01/2026' },
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026', agency: 'ICA-001' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299', agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026', agency: 'ICA-001' },
      { label: 'Span-C', status: 'S', beginDate: '07/15/2026', endDate: '07/31/2026', agency: 'ICA-001' },
      { label: 'Span-D', status: 'A', beginDate: '08/01/2026', endDate: '12/31/2299', agency: 'ICA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'S', startReason: '2P', stopReason: '2P', description: 'Close suspended span with old agency' },
      { sequence: 2, scenario: 'S620', type: 'O', status: 'S', startReason: '2P', stopReason: '2P', description: 'Create suspended span with new agency' },
      { sequence: 3, scenario: 'S610', type: 'O', status: 'A', startReason: '2P', description: 'Create active span with new agency' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-018: New SDPC Suspension (S240_001_SDPC)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_018: {
    testCaseId: 'TC-018',
    scenarioId: 'S240_001_SDPC',
    title: 'New SDPC Suspension (Bounded)',
    program: 'SDPC',
    decisionTablePath: 'S100(9)→S210→S240(1)→S500+S510+S520(Col2)',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '08/15/2026',
      suspensionEndDate: '09/14/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '08/15/2026' },
      { label: 'Span-B', status: 'S', beginDate: '08/16/2026', endDate: '09/13/2026' },
      { label: 'Span-C', status: 'A', beginDate: '09/14/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S500', type: 'C', status: 'A', description: 'Close Span-A before SDPC suspension' },
      { sequence: 2, scenario: 'S510', type: 'A', status: 'S', description: 'Add SDPC suspension span' },
      { sequence: 3, scenario: 'S520', type: 'A', status: 'A', description: 'Create post-suspension SDPC span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-019: Begin Date Changed Earlier (S220_002)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_019: {
    testCaseId: 'TC-019',
    scenarioId: 'S220_002_IRIS',
    title: 'Enrollment Begin Date Changed to Earlier',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(2)→S310+S300',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '07/01/2026',
      enrollmentEndDate: '12/31/2299',
      newEnrollmentStartDate: '06/01/2026',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '07/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing span' },
      { sequence: 2, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create span with new earlier begin date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-020: Begin Date Changed Later (S220_003)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_020: {
    testCaseId: 'TC-020',
    scenarioId: 'S220_003_IRIS',
    title: 'Enrollment Begin Date Changed to Later',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(3)→S310+S300',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      newEnrollmentStartDate: '07/15/2026',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing span' },
      { sequence: 2, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create span with new later begin date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-021: Suspension Begin Date Earlier (S230_001)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_021: {
    testCaseId: 'TC-021',
    scenarioId: 'S230_001_IRIS',
    title: 'Suspension Begin Date Changed to Earlier',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(1)→S400+S410+S300+S510',
    transactionCount: 4,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/14/2026',
      newSuspensionStartDate: '06/30/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '06/30/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/01/2026', endDate: '07/13/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/14/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S400', type: 'C', status: 'A', startReason: '2I', stopReason: '2I', description: 'Shorten Span-A end date' },
      { sequence: 2, scenario: 'S410', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing Span-B' },
      { sequence: 3, scenario: 'S300', type: 'O', status: 'A', startReason: '2I', stopReason: '2I', description: 'Recreate Span-A' },
      { sequence: 4, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Create new Span-B with earlier begin' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-022: Suspension Begin Date Later (S230_002)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_022: {
    testCaseId: 'TC-022',
    scenarioId: 'S230_002_IRIS',
    title: 'Suspension Begin Date Changed to Later',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(2)→S410+S510+S400',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/16/2026',
      newSuspensionStartDate: '07/02/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/02/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/03/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S410', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing Span-B' },
      { sequence: 2, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Create new Span-B with later begin' },
      { sequence: 3, scenario: 'S400', type: 'O', status: 'A', startReason: '2I', stopReason: '2I', description: 'Extend Span-A end date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-023: Suspension End Date Earlier (S230_003)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_023: {
    testCaseId: 'TC-023',
    scenarioId: 'S230_003_IRIS',
    title: 'Suspension End Date Changed to Earlier',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(3)→S410+S310+S510+S520',
    transactionCount: 4,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/15/2026',
      newSuspensionEndDate: '07/13/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/12/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/13/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S440', type: 'C', status: 'S', startReason: '2Q', stopReason: '2W', description: 'Shorten Span-B end date' },
      { sequence: 2, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing Span-C' },
      { sequence: 3, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Recreate Span-B' },
      { sequence: 4, scenario: 'S520', type: 'O', status: 'A', startReason: '2Q', description: 'Create new Span-C' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-024: Suspension End Date Later (S230_004)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_024: {
    testCaseId: 'TC-024',
    scenarioId: 'S230_004_IRIS',
    title: 'Suspension End Date Changed to Later',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(4)→S310+S445+S520',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/15/2026',
      newSuspensionEndDate: '07/20/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/19/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/20/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing Span-C' },
      { sequence: 2, scenario: 'S445', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Extend Span-B end date' },
      { sequence: 3, scenario: 'S520', type: 'O', status: 'A', startReason: '2Q', description: 'Create new Span-C' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-025: Suspension End Date Valid → Null (S230_007)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_025: {
    testCaseId: 'TC-025',
    scenarioId: 'S230_007_IRIS',
    title: 'Suspension End Date: Valid → Null',
    program: 'IRIS',
    decisionTablePath: 'S100(4)→S200→S230(7)→S310+S445',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/15/2026',
      newSuspensionEndDate: null, // Set to null — indefinite
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing Span-C' },
      { sequence: 2, scenario: 'S445', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Extend Span-B to 12/31/2299' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-026: SDPC End Date Earlier (S220_004_SDPC)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_026: {
    testCaseId: 'TC-026',
    scenarioId: 'S220_004_SDPC',
    title: 'SDPC End Date Changed to Earlier (Disenrollment)',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(4)→S340(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      newEnrollmentEndDate: '09/30/2026',
      statusChange: 'Disenrolled',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S340', type: 'C', status: 'A', description: 'Shorten SDPC end date (disenrollment)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-027: SDPC Suspension Deleted (S230_005_SDPC)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_027: {
    testCaseId: 'TC-027',
    scenarioId: 'S230_005_SDPC',
    title: 'SDPC Suspension Deleted',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(5)→S410+S470(Col2)',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '08/15/2026',
      suspensionEndDate: '09/14/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '08/15/2026' },
      { label: 'Span-B', status: 'S', beginDate: '08/16/2026', endDate: '09/13/2026' },
      { label: 'Span-C', status: 'A', beginDate: '09/14/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '09/13/2026' },
      { label: 'Span-C', status: 'A', beginDate: '09/14/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S410', type: 'A', status: 'I', description: 'Delete SDPC Span-B' },
      { sequence: 2, scenario: 'S470', type: 'A', status: 'A', description: 'Extend SDPC Span-A end date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-028: End Date Later + Active Suspension (S220_005b)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_028: {
    testCaseId: 'TC-028',
    scenarioId: 'S220_005b_IRIS',
    title: 'End Date Later with Last Span Suspended',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(5)→S350(1)→S360',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/02/2026', // Only 1 day — too short
      newSuspensionEndDate: '07/10/2026',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/09/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/10/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S360', type: 'O', status: 'A', startReason: '2Q', description: 'Create post-suspension span (Span-C)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-029: Multiple MMIS Errors (S220_001 with multiple errors)
  // Lifecycle: Draft → Referred → Enrolled (triggers MMIS sync → FL)
  // Errors: 9110 (CITY IS MISSING) + 9156 (FEA DATES DO NOT SPAN)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_029: {
    testCaseId: 'TC-029',
    scenarioId: 'S220_001_IRIS_MULTI_ERROR',
    title: 'Multiple MMIS Error Segments',
    program: 'IRIS',
    decisionTablePath: 'S100(1)→S200→S220(1)→S300',
    transactionCount: 1,
    expectedResponse: 'FL',
    bcInput: {
      enrollmentStartDate: '01/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [], // Rejected — enrollment span NOT activated
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Attempt create — rejected with multiple errors (9110 + 9156)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-030: SE Response (S220_001 with success+errors)
  // Lifecycle: Draft → Referred → Enrolled (triggers MMIS sync → SE)
  // Enrollment is activated despite warnings per BR-D01-010
  // ═══════════════════════════════════════════════════════════════════════════
  TC_030: {
    testCaseId: 'TC-030',
    scenarioId: 'S220_001_IRIS_SE',
    title: 'SE Response — Enrollment Activated with Warnings',
    program: 'IRIS',
    decisionTablePath: 'S100(1)→S200→S220(1)→S300',
    transactionCount: 1,
    expectedResponse: 'SE',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '12/31/2299' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create enrollment — SE (success with errors)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-031: ICA Transfer — Span-C Exists (S255_001)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_031: {
    testCaseId: 'TC-031',
    scenarioId: 'S255_001_IRIS',
    title: 'ICA Transfer — Span-C Exists (Delete + Create)',
    program: 'IRIS',
    decisionTablePath: 'S100(6)→S200→S250(1)→S600+S255(1)→S310+S610',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '12/31/2299',
      suspensionStartDate: '07/01/2026',
      suspensionEndDate: '07/15/2026',
      agencyChange: { oldAgency: 'ICA-001', newAgency: 'ICA-002', effectiveDate: '10/01/2026' },
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '12/31/2299', agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: '06/01/2026', endDate: '07/01/2026' },
      { label: 'Span-B', status: 'S', beginDate: '07/02/2026', endDate: '07/14/2026' },
      { label: 'Span-C', status: 'A', beginDate: '07/15/2026', endDate: '09/30/2026', agency: 'ICA-001' },
      { label: 'Span-D', status: 'A', beginDate: '10/01/2026', endDate: '12/31/2299', agency: 'ICA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'A', startReason: '2P', stopReason: '2P', description: 'Close Span-C with old ICA' },
      { sequence: 2, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete old Span-C' },
      { sequence: 3, scenario: 'S610', type: 'O', status: 'A', startReason: '2P', description: 'Create new span with ICA-002' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-032: Address Update — No Current Span (S700_002)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_032: {
    testCaseId: 'TC-032',
    scenarioId: 'S700_002_IRIS',
    title: 'Address Update — No Current Span (No Transaction)',
    program: 'IRIS',
    decisionTablePath: 'S100(11)→S200→S700(2)→⛔',
    transactionCount: 0,
    expectedResponse: 'NONE',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '09/30/2026', // Disenrolled — no current span
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026' }, // Unchanged
    ],
    transactions: [], // No transactions sent
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-033: Disenrolled Span Created — Real Reason Code (S345)
  // ═══════════════════════════════════════════════════════════════════════════
  TC_033: {
    testCaseId: 'TC-033',
    scenarioId: 'S220_008_IRIS',
    title: 'Disenrolled Span Created — Real Reason Code Sent (S345)',
    program: 'IRIS',
    decisionTablePath: 'S100(2)→S200→S220(8)→S345',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: '06/01/2026',
      enrollmentEndDate: '09/30/2026',
      enrollmentStatus: 'Disenrolled',
      statusChange: 'Disenrolled',
      statusReason: 'Deceased',
      disenrollmentReason: 'Deceased',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: '06/01/2026', endDate: '09/30/2026' }, // Same dates, new reason codes
    ],
    transactions: [
      { sequence: 1, scenario: 'S345', type: 'C', status: 'A', startReason: '64', stopReason: '64', description: 'Re-send closure with real disenrollment reason code' },
    ],
  },
};

// ─── Helper: Get scenario by test case ID ─────────────────────────────────────

export function getScenario(tcId: string): ScenarioData {
  const key = tcId.replace('-', '_').replace('TC_0', 'TC_0');
  const normalizedKey = `TC_${tcId.replace('TC-', '').replace(/^0+/, '').padStart(3, '0')}`;
  return SCENARIOS[normalizedKey] || SCENARIOS[key];
}

/** Get scenario by TC number (e.g., 1, 2, 3...) */
export function getScenarioByNumber(num: number): ScenarioData {
  const key = `TC_${String(num).padStart(3, '0')}`;
  return SCENARIOS[key];
}
