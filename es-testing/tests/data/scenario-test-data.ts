/**
 * Centralized Test Data — Enrollment Service Scenario Diagrams
 *
 * Source: docs/Enrollment_Service_Scenario_Diagrams.md
 * All dates and expected values for each test case scenario.
 *
 * Dates are dynamically computed relative to the first of the previous month.
 *
 * Usage:
 *   import { SCENARIOS } from '../../data/scenario-test-data';
 *   const data = SCENARIOS.TC_001; // or SCENARIOS.TC_002, etc.
 */

// ─── Date Utilities ───────────────────────────────────────────────────────────

const SENTINEL_END_DATE = '12/31/2299';

/**
 * Anchor date: First day of the previous month relative to today.
 */
function getAnchorDate(): Date {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  return new Date(year, month, 1);
}

const ANCHOR = getAnchorDate();

/** Format a Date as MM/DD/YYYY */
function fmt(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Add months to a date (day stays the same unless clamped to month-end) */
function addMonths(base: Date, months: number): Date {
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Add days to a date */
function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

// ─── Computed Reference Dates ─────────────────────────────────────────────────

/** enrollmentStartDate for most scenarios: first of previous month */
const ES = ANCHOR;                              // e.g. 06/01/2026
/** enrollmentStartDate + 1 month (common suspensionStartDate for IRIS) */
const ES_PLUS_1M = addMonths(ES, 1);           // e.g. 07/01/2026
/** enrollmentStartDate + 2 months (common suspensionStartDate for SDPC) */
const ES_PLUS_2M = addMonths(ES, 2);           // e.g. 08/01/2026
/** enrollmentStartDate + 3 months */
const ES_PLUS_3M = addMonths(ES, 3);           // e.g. 09/01/2026
/** enrollmentStartDate + 4 months */
const ES_PLUS_4M = addMonths(ES, 4);           // e.g. 10/01/2026
/** Last day of enrollmentStart + 3 months (end of 3rd month) */
const ES_PLUS_3M_END = addDays(addMonths(ES, 4), -1); // e.g. 09/30/2026
/** Last day of enrollmentStart + 2 months (end of 2nd month) */
const ES_PLUS_2M_END = addDays(addMonths(ES, 3), -1); // e.g. 08/31/2026

// Suspension dates (IRIS standard: suspensionStart + 14 days)
const SUSP_START_IRIS = ES_PLUS_1M;             // e.g. 07/01/2026
const SUSP_END_IRIS = addDays(SUSP_START_IRIS, 14); // e.g. 07/15/2026

// Suspension dates (SDPC standard: suspensionStart + 14 days)
const SUSP_START_SDPC = ES_PLUS_2M;             // e.g. 08/01/2026
const SUSP_END_SDPC = addDays(SUSP_START_SDPC, 14); // e.g. 08/15/2026

// MMIS span boundary offsets (±1 day pattern)
const SUSP_START_IRIS_PLUS1 = addDays(SUSP_START_IRIS, 1);  // Span-B begin
const SUSP_END_IRIS_MINUS1 = addDays(SUSP_END_IRIS, -1);    // Span-B end
const SUSP_START_SDPC_PLUS1 = addDays(SUSP_START_SDPC, 1);  // Span-B begin (SDPC)
const SUSP_END_SDPC_MINUS1 = addDays(SUSP_END_SDPC, -1);    // Span-B end (SDPC)

// TC-specific computed dates
const TC004_START = addMonths(ES, -5);          // 5 months before anchor (01/01 equiv)
const TC006_START = addDays(ES_PLUS_1M, 14);    // enrollmentStart + 1month + 14 days
const TC006_NEW_END = addDays(addMonths(ES, 5), -1); // enrollmentStart + ~5 months end
const TC007_END = ES_PLUS_3M_END;               // bounded at 09/30 equiv
const TC007_NEW_END = ES_PLUS_2M_END;           // shorten to 08/31 equiv
const TC009_START = ES_PLUS_4M;                 // reinstatement start (10/01 equiv)
const TC010_SUSP_START = addDays(ES, 14);       // enrollmentStart + 14 days
const TC011_SUSP_END = addDays(SUSP_START_IRIS, 1); // Too short: start + 1 day
const TC012_SUSP_START = addDays(ES_PLUS_2M, 14);   // 08/15 equiv
const TC012_SUSP_END = addDays(TC012_SUSP_START, 30); // 09/14 equiv
const TC019_START = ES_PLUS_1M;                 // original start at +1 month
const TC019_NEW_START = ES;                     // move earlier to anchor
const TC020_NEW_START = addDays(ES_PLUS_1M, 14); // move later by +1.5 months
const TC021_NEW_SUSP_START = addDays(SUSP_START_IRIS, -1); // 1 day earlier
const TC022_SUSP_END = addDays(SUSP_START_IRIS, 15);  // 07/16 equiv
const TC022_NEW_SUSP_START = addDays(SUSP_START_IRIS, 1); // 1 day later
const TC023_NEW_SUSP_END = addDays(SUSP_END_IRIS, -2); // 2 days earlier
const TC024_NEW_SUSP_END = addDays(SUSP_END_IRIS, 5);  // 5 days later
const TC003_AGENCY_EFF = addDays(ES, 42);       // +42 days
const TC016_AGENCY_EFF = ES_PLUS_4M;            // +4 months
const TC017_AGENCY_EFF = ES_PLUS_2M;            // +2 months
const TC031_AGENCY_EFF = ES_PLUS_4M;            // +4 months

// TC-specific: MMIS span boundary dates for TC-012/TC-027
const TC012_SPAN_A_END = TC012_SUSP_START;                    // 08/15
const TC012_SPAN_B_BEGIN = addDays(TC012_SUSP_START, 1);      // 08/16
const TC012_SPAN_B_END = addDays(TC012_SUSP_END, -1);         // 09/13
const TC012_SPAN_C_BEGIN = TC012_SUSP_END;                    // 09/14

// TC-010 MMIS boundaries
const TC010_SPAN_A_END = addDays(TC010_SUSP_START, -1);       // 06/14
const TC010_SPAN_B_BEGIN = TC010_SUSP_START;                  // 06/15

// TC-003 MMIS boundaries (agency transfer: effective - 1 day for old span end, effective for new span begin)
const TC003_OLD_SPAN_END = addDays(ES_PLUS_3M_END, 0);       // 09/30 equiv
const TC003_NEW_SPAN_BEGIN = ES_PLUS_4M;                      // 10/01 equiv

// TC-016 MMIS boundaries (same as TC-003 pattern)
const TC016_OLD_SPAN_END = addDays(TC016_AGENCY_EFF, -1);     // 09/30 equiv
const TC016_NEW_SPAN_BEGIN = TC016_AGENCY_EFF;                // 10/01

// TC-006 end date
const TC006_NEW_END_ACTUAL = addDays(addMonths(ES_PLUS_1M, 3), 16); // 10/31 equiv

// TC-028/TC-047 special dates
const TC028_SUSP_START = SUSP_START_IRIS;                     // 07/01
const TC028_SUSP_END_SHORT = addDays(SUSP_START_IRIS, 1);     // 07/02 (too short)
const TC028_NEW_SUSP_END = addDays(SUSP_START_IRIS, 9);       // 07/10
const TC047_SUSP_START = SUSP_START_SDPC;                     // 08/01
const TC047_SUSP_END_SHORT = addDays(SUSP_START_SDPC, 1);     // 08/02 (too short)
const TC047_NEW_SUSP_END = addDays(SUSP_START_SDPC, 9);       // 08/10

// TC-013 specific
const TC013_NEW_SUSP_END = addDays(SUSP_START_IRIS, 9);       // 07/10

// TC-038 specific
const TC038_NEW_SUSP_END = addDays(SUSP_START_SDPC, 14);      // 08/15

// TC-040 specific
const TC040_START = addDays(ES, 1);                           // 06/02 equiv
const TC040_NEW_START = ES;                                   // 06/01

// TC-041 specific
const TC041_NEW_START = addDays(ES, 14);                      // 06/15 equiv

// TC-042 specific
const TC042_NEW_SUSP_START = addDays(SUSP_START_SDPC, -2);    // 07/30 equiv

// TC-043 specific
const TC043_NEW_SUSP_START = addDays(SUSP_START_SDPC, 2);     // 08/03 equiv

// TC-044 specific
const TC044_NEW_SUSP_END = addDays(SUSP_END_SDPC, -3);        // 08/12 equiv

// TC-045 specific
const TC045_NEW_SUSP_END = addDays(SUSP_END_SDPC, 5);         // 08/20 equiv

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
    enrollmentStatus?: string;
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: '' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create new enrollment span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-002: Enrolled → Suspended with end date (S240_001)
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      agencyChange: { oldAgency: 'First Person Care Consultants', newAgency: 'TMG (The Management Group)', effectiveDate: fmt(TC003_AGENCY_EFF) },
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE, agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(TC003_OLD_SPAN_END), agency: 'ICA-001' },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC003_NEW_SPAN_BEGIN), endDate: SENTINEL_END_DATE, agency: 'ICA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'A', startReason: '2P', stopReason: '2P', description: 'Close span with old ICA' },
      { sequence: 2, scenario: 'S610', type: 'O', status: 'A', startReason: '2P', description: 'Create span with new ICA' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-004: Hard Error — FEA Dates (S220_001 with invalid FEA)
  // Anchor: 5 months before standard anchor (01/01 equivalent)
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
      enrollmentStartDate: fmt(TC004_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [],
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create enrollment — SU with different ID returned' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-006: End Date Earlier — Disenrollment (S220_004)
  // enrollmentStart = anchor + 1 month + 14 days; newEnd = anchor + ~5 months end
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
      enrollmentStartDate: fmt(TC006_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      newEnrollmentEndDate: fmt(TC006_NEW_END_ACTUAL),
      statusChange: 'Disenrolled',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC006_START), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC006_START), endDate: fmt(TC006_NEW_END_ACTUAL) },
    ],
    transactions: [
      { sequence: 1, scenario: 'S340', type: 'C', status: 'A', startReason: '2W', stopReason: '2W', description: 'Shorten end date via Closure (disenrollment)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-007: End Date Later — Extension (S220_005a)
  // enrollmentEnd bounded at +4 months end; newEnd = +3 months end
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: fmt(TC007_END),
      newEnrollmentEndDate: fmt(TC007_NEW_END),
      statusChange: 'Enrolled',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(TC007_END) },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(TC007_NEW_END) },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      statusChange: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete enrollment span (inactivate)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-009: Disenrolled → Enrolled Reinstatement (S220_007)
  // enrollmentStart = anchor + 4 months
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
      enrollmentStartDate: fmt(TC009_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusChange: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(TC009_START), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create new enrollment span (reinstatement)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-010: Open-Ended Suspension (S240_002)
  // suspensionStart = anchor + 14 days; no end date
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(TC010_SUSP_START),
      suspensionEndDate: undefined,
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC010_SPAN_A_END) },
      { label: 'Span-B', status: 'S', beginDate: fmt(TC010_SPAN_B_BEGIN), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S500', type: 'C', status: 'A', startReason: '2I', stopReason: '2I', description: 'Close Span-A before suspension' },
      { sequence: 2, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Add open-ended suspension span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-011: Suspension Too Short (S240_003 — no transaction)
  // suspensionEnd = suspensionStart + 1 day (< 3 days)
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(TC011_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    transactions: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-012: Suspension Deleted (S230_005)
  // suspensionStart = anchor + 2.5 months; suspensionEnd = suspStart + 30 days
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(TC012_SUSP_START),
      suspensionEndDate: fmt(TC012_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC012_SPAN_A_END) },
      { label: 'Span-B', status: 'S', beginDate: fmt(TC012_SPAN_B_BEGIN), endDate: fmt(TC012_SPAN_B_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC012_SPAN_C_BEGIN), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC012_SPAN_B_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC012_SPAN_C_BEGIN), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      newSuspensionEndDate: fmt(TC013_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(TC013_NEW_SUSP_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(addDays(TC013_NEW_SUSP_END, 1)), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [{ label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE }],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      agencyChange: { oldAgency: 'FEA-001', newAgency: 'FEA-002', effectiveDate: fmt(TC016_AGENCY_EFF) },
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE, agency: 'FEA-001' },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(TC016_OLD_SPAN_END), agency: 'FEA-001' },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC016_NEW_SPAN_BEGIN), endDate: SENTINEL_END_DATE, agency: 'FEA-002' },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS_MINUS1),
      agencyChange: { oldAgency: 'ICA-001', newAgency: 'ICA-002', effectiveDate: fmt(TC017_AGENCY_EFF) },
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1), agency: 'ICA-001' },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE, agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1), agency: 'ICA-001' },
      { label: 'Span-C', status: 'S', beginDate: fmt(SUSP_END_IRIS), endDate: fmt(addDays(TC017_AGENCY_EFF, -1)), agency: 'ICA-001' },
      { label: 'Span-D', status: 'A', beginDate: fmt(TC017_AGENCY_EFF), endDate: SENTINEL_END_DATE, agency: 'ICA-002' },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S500', type: 'C', status: 'A', description: 'Close Span-A before SDPC suspension' },
      { sequence: 2, scenario: 'S510', type: 'A', status: 'S', description: 'Add SDPC suspension span' },
      { sequence: 3, scenario: 'S520', type: 'A', status: 'A', description: 'Create post-suspension SDPC span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-019: Begin Date Changed Earlier (S220_002)
  // original start = anchor + 1 month; new start = anchor
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
      enrollmentStartDate: fmt(TC019_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      newEnrollmentStartDate: fmt(TC019_NEW_START),
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC019_START), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC019_NEW_START), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing span' },
      { sequence: 2, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create span with new earlier begin date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-020: Begin Date Changed Later (S220_003)
  // new start = anchor + 1.5 months
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      newEnrollmentStartDate: fmt(TC020_NEW_START),
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC020_NEW_START), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing span' },
      { sequence: 2, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Create span with new later begin date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-021: Suspension Begin Date Earlier (S230_001)
  // newSuspensionStart = suspensionStart - 1 day
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS_MINUS1),
      newSuspensionStartDate: fmt(TC021_NEW_SUSP_START),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC021_NEW_SUSP_START) },
      { label: 'Span-B', status: 'S', beginDate: fmt(addDays(TC021_NEW_SUSP_START, 1)), endDate: fmt(addDays(SUSP_END_IRIS, -2)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(addDays(SUSP_END_IRIS, -1)), endDate: SENTINEL_END_DATE },
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
  // suspensionEnd = suspStart + 15 days; newSuspStart = suspStart + 1 day
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(TC022_SUSP_END),
      newSuspensionStartDate: fmt(TC022_NEW_SUSP_START),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC022_NEW_SUSP_START) },
      { label: 'Span-B', status: 'S', beginDate: fmt(addDays(TC022_NEW_SUSP_START, 1)), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S410', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete existing Span-B' },
      { sequence: 2, scenario: 'S510', type: 'O', status: 'S', startReason: '2I', stopReason: '2I', description: 'Create new Span-B with later begin' },
      { sequence: 3, scenario: 'S400', type: 'O', status: 'A', startReason: '2I', stopReason: '2I', description: 'Extend Span-A end date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-023: Suspension End Date Earlier (S230_003)
  // newSuspEnd = suspEnd - 2 days
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS),
      newSuspensionEndDate: fmt(TC023_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(addDays(TC023_NEW_SUSP_END, -1)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC023_NEW_SUSP_END), endDate: SENTINEL_END_DATE },
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
  // newSuspEnd = suspEnd + 5 days
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS),
      newSuspensionEndDate: fmt(TC024_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(addDays(TC024_NEW_SUSP_END, -1)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC024_NEW_SUSP_END), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS),
      newSuspensionEndDate: null,
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      newEnrollmentEndDate: fmt(ES_PLUS_3M_END),
      statusChange: 'Disenrolled',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    transactions: [
      { sequence: 1, scenario: 'S340', type: 'C', status: 'A', description: 'Shorten SDPC end date (disenrollment)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-027: SDPC Suspension Deleted (S230_005_SDPC)
  // Uses same suspension dates as TC-012
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(TC012_SUSP_START),
      suspensionEndDate: fmt(TC012_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC012_SPAN_A_END) },
      { label: 'Span-B', status: 'S', beginDate: fmt(TC012_SPAN_B_BEGIN), endDate: fmt(TC012_SPAN_B_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC012_SPAN_C_BEGIN), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC012_SPAN_B_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC012_SPAN_C_BEGIN), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(TC028_SUSP_START),
      suspensionEndDate: fmt(TC028_SUSP_END_SHORT),
      newSuspensionEndDate: fmt(TC028_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC028_SUSP_START) },
      { label: 'Span-B', status: 'S', beginDate: fmt(TC028_SUSP_END_SHORT), endDate: fmt(addDays(TC028_NEW_SUSP_END, -1)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC028_NEW_SUSP_END), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S360', type: 'O', status: 'A', startReason: '2Q', description: 'Create post-suspension span (Span-C)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-029: Multiple MMIS Errors (S220_001 with multiple errors)
  // Same as TC-004 anchor (5 months before standard)
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
      enrollmentStartDate: fmt(TC004_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'O', status: 'A', startReason: '2L', description: 'Attempt create — rejected with multiple errors (9110 + 9156)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-030: SE Response (S220_001 with success+errors)
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_IRIS),
      suspensionEndDate: fmt(SUSP_END_IRIS),
      agencyChange: { oldAgency: 'ICA-001', newAgency: 'ICA-002', effectiveDate: fmt(TC031_AGENCY_EFF) },
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: SENTINEL_END_DATE, agency: 'ICA-001' },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_IRIS) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_IRIS_PLUS1), endDate: fmt(SUSP_END_IRIS_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_IRIS), endDate: fmt(addDays(TC031_AGENCY_EFF, -1)), agency: 'ICA-001' },
      { label: 'Span-D', status: 'A', beginDate: fmt(TC031_AGENCY_EFF), endDate: SENTINEL_END_DATE, agency: 'ICA-002' },
    ],
    transactions: [
      { sequence: 1, scenario: 'S600', type: 'C', status: 'A', startReason: '2P', stopReason: '2P', description: 'Close Span-C with old ICA' },
      { sequence: 2, scenario: 'S310', type: 'O', status: 'I', startReason: '2L', stopReason: '2W', description: 'Delete old Span-C' },
      { sequence: 3, scenario: 'S610', type: 'O', status: 'A', startReason: '2P', description: 'Create new span with ICA-002' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-032: Address Update — No Current Span (S700_002)
  // Bounded end date (disenrolled)
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: fmt(ES_PLUS_3M_END),
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    transactions: [],
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
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: fmt(ES_PLUS_3M_END),
      enrollmentStatus: 'Disenrolled',
      statusChange: 'Disenrolled',
      statusReason: 'Deceased',
      disenrollmentReason: 'Deceased',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    transactions: [
      { sequence: 1, scenario: 'S345', type: 'C', status: 'A', startReason: '64', stopReason: '64', description: 'Re-send closure with real disenrollment reason code' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-034: SDPC End Date Later (Extension) — SDPC version of TC-007
  // ═══════════════════════════════════════════════════════════════════════════
  TC_034: {
    testCaseId: 'TC-034',
    scenarioId: 'S220_005_SDPC',
    title: 'SDPC End Date Later (Extension)',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(5)→S350(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: fmt(ES_PLUS_3M_END),
      newEnrollmentEndDate: SENTINEL_END_DATE,
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S350', type: 'A', status: 'A', description: 'Extend SDPC end date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-035: SDPC Disenrolled → Enrolled (Reinstatement) — SDPC version of TC-009
  // ═══════════════════════════════════════════════════════════════════════════
  TC_035: {
    testCaseId: 'TC-035',
    scenarioId: 'S220_001_SDPC_REINSTATE',
    title: 'SDPC Disenrolled → Enrolled (Reinstatement)',
    program: 'SDPC',
    decisionTablePath: 'S100(7)→S210→S220(1)→S300(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(TC009_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      enrollmentStatus: 'Enrolled',
      statusReason: 'Not Applicable',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC009_START), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S300', type: 'A', status: 'A', description: 'Create new SDPC enrollment span (reinstatement)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-036: SDPC Open-Ended Suspension (No End Date) — SDPC version of TC-010
  // suspensionStart = anchor + 2 months
  // ═══════════════════════════════════════════════════════════════════════════
  TC_036: {
    testCaseId: 'TC-036',
    scenarioId: 'S240_002_SDPC',
    title: 'SDPC Open-Ended Suspension (No End Date)',
    program: 'SDPC',
    decisionTablePath: 'S100(9)→S210→S240(2)→S500+S510(Col2)',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S500', type: 'A', status: 'A', description: 'Close Span-A before SDPC open-ended suspension' },
      { sequence: 2, scenario: 'S510', type: 'A', status: 'S', description: 'Add SDPC open-ended suspension span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-037: SDPC Suspension < 3 Days (No Transaction) — SDPC version of TC-011
  // ═══════════════════════════════════════════════════════════════════════════
  TC_037: {
    testCaseId: 'TC-037',
    scenarioId: 'S240_003_SDPC',
    title: 'SDPC Suspension < 3 Days (No Transaction)',
    program: 'SDPC',
    decisionTablePath: 'S100(9)→S210→S240(3)→⛔',
    transactionCount: 0,
    expectedResponse: 'NONE',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      suspensionEndDate: fmt(addDays(SUSP_START_SDPC, 1)),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    transactions: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-038: SDPC Suspension End: Null → Valid — SDPC version of TC-013
  // ═══════════════════════════════════════════════════════════════════════════
  TC_038: {
    testCaseId: 'TC-038',
    scenarioId: 'S230_006_SDPC',
    title: 'SDPC Suspension End: Null → Valid',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(6)→S440+S520(Col2)',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      newSuspensionEndDate: fmt(TC038_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(TC038_NEW_SUSP_END) },
      { label: 'Span-C', status: 'A', beginDate: fmt(addDays(TC038_NEW_SUSP_END, 1)), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S440', type: 'A', status: 'S', description: 'Shorten SDPC Span-B end date' },
      { sequence: 2, scenario: 'S520', type: 'A', status: 'A', description: 'Create SDPC Span-C (post-suspension)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-039: SDPC Address Update (No Transaction) — SDPC version of TC-014
  // ═══════════════════════════════════════════════════════════════════════════
  TC_039: {
    testCaseId: 'TC-039',
    scenarioId: 'S700_001_SDPC',
    title: 'SDPC Address Update (No Transaction — SDPC Excluded)',
    program: 'SDPC',
    decisionTablePath: 'S100(11)→S210→S700→⛔',
    transactionCount: 0,
    expectedResponse: 'NONE',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    transactions: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-040: SDPC Begin Date Changed to Earlier — SDPC version of TC-019
  // original start = anchor + 1 day; new start = anchor
  // ═══════════════════════════════════════════════════════════════════════════
  TC_040: {
    testCaseId: 'TC-040',
    scenarioId: 'S220_002_SDPC',
    title: 'SDPC Begin Date Changed to Earlier',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(2)→S310+S300(Col2)',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(TC040_START),
      enrollmentEndDate: SENTINEL_END_DATE,
      newEnrollmentStartDate: fmt(TC040_NEW_START),
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES_PLUS_1M), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC040_NEW_START), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'A', status: 'I', description: 'Delete existing SDPC span' },
      { sequence: 2, scenario: 'S300', type: 'A', status: 'A', description: 'Create SDPC span with earlier begin date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-041: SDPC Begin Date Changed to Later — SDPC version of TC-020
  // new start = anchor + 14 days
  // ═══════════════════════════════════════════════════════════════════════════
  TC_041: {
    testCaseId: 'TC-041',
    scenarioId: 'S220_003_SDPC',
    title: 'SDPC Begin Date Changed to Later',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(3)→S310+S300(Col2)',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      newEnrollmentStartDate: fmt(TC041_NEW_START),
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(TC041_NEW_START), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'A', status: 'I', description: 'Delete existing SDPC span' },
      { sequence: 2, scenario: 'S300', type: 'A', status: 'A', description: 'Create SDPC span with later begin date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-042: SDPC Suspension Begin Date Earlier — SDPC version of TC-021
  // newSuspStart = suspStart - 2 days
  // ═══════════════════════════════════════════════════════════════════════════
  TC_042: {
    testCaseId: 'TC-042',
    scenarioId: 'S230_001_SDPC',
    title: 'SDPC Suspension Begin Date Earlier',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(1)→S400+S410+S300+S510(Col2)',
    transactionCount: 4,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      suspensionEndDate: fmt(SUSP_END_SDPC),
      newSuspensionStartDate: fmt(TC042_NEW_SUSP_START),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC042_NEW_SUSP_START) },
      { label: 'Span-B', status: 'S', beginDate: fmt(addDays(TC042_NEW_SUSP_START, 1)), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S400', type: 'A', status: 'A', description: 'Shorten SDPC Span-A end date' },
      { sequence: 2, scenario: 'S410', type: 'A', status: 'I', description: 'Delete existing SDPC Span-B' },
      { sequence: 3, scenario: 'S300', type: 'A', status: 'A', description: 'Recreate SDPC Span-A' },
      { sequence: 4, scenario: 'S510', type: 'A', status: 'S', description: 'Create new SDPC Span-B with earlier begin' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-043: SDPC Suspension Begin Date Later — SDPC version of TC-022
  // newSuspStart = suspStart + 2 days
  // ═══════════════════════════════════════════════════════════════════════════
  TC_043: {
    testCaseId: 'TC-043',
    scenarioId: 'S230_002_SDPC',
    title: 'SDPC Suspension Begin Date Later',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(2)→S410+S510+S400(Col2)',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      suspensionEndDate: fmt(SUSP_END_SDPC),
      newSuspensionStartDate: fmt(TC043_NEW_SUSP_START),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC043_NEW_SUSP_START) },
      { label: 'Span-B', status: 'S', beginDate: fmt(addDays(TC043_NEW_SUSP_START, 1)), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S410', type: 'A', status: 'I', description: 'Delete existing SDPC Span-B' },
      { sequence: 2, scenario: 'S510', type: 'A', status: 'S', description: 'Create new SDPC Span-B with later begin' },
      { sequence: 3, scenario: 'S400', type: 'A', status: 'A', description: 'Extend SDPC Span-A end date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-044: SDPC Suspension End Date Earlier — SDPC version of TC-023
  // newSuspEnd = suspEnd - 3 days
  // ═══════════════════════════════════════════════════════════════════════════
  TC_044: {
    testCaseId: 'TC-044',
    scenarioId: 'S230_003_SDPC',
    title: 'SDPC Suspension End Date Earlier',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(3)→S440+S310+S510+S520(Col2)',
    transactionCount: 4,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      suspensionEndDate: fmt(SUSP_END_SDPC),
      newSuspensionEndDate: fmt(TC044_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(addDays(TC044_NEW_SUSP_END, -1)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC044_NEW_SUSP_END), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S440', type: 'A', status: 'S', description: 'Shorten SDPC Span-B end date' },
      { sequence: 2, scenario: 'S310', type: 'A', status: 'I', description: 'Delete existing SDPC Span-C' },
      { sequence: 3, scenario: 'S510', type: 'A', status: 'S', description: 'Recreate SDPC Span-B' },
      { sequence: 4, scenario: 'S520', type: 'A', status: 'A', description: 'Create new SDPC Span-C' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-045: SDPC Suspension End Date Later — SDPC version of TC-024
  // newSuspEnd = suspEnd + 5 days
  // ═══════════════════════════════════════════════════════════════════════════
  TC_045: {
    testCaseId: 'TC-045',
    scenarioId: 'S230_004_SDPC',
    title: 'SDPC Suspension End Date Later',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(4)→S310+S445+S520(Col2)',
    transactionCount: 3,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      suspensionEndDate: fmt(SUSP_END_SDPC),
      newSuspensionEndDate: fmt(TC045_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(addDays(TC045_NEW_SUSP_END, -1)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC045_NEW_SUSP_END), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'A', status: 'I', description: 'Delete existing SDPC Span-C' },
      { sequence: 2, scenario: 'S445', type: 'A', status: 'S', description: 'Extend SDPC Span-B end date' },
      { sequence: 3, scenario: 'S520', type: 'A', status: 'A', description: 'Create new SDPC Span-C' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-046: SDPC Suspension End: Valid → Null — SDPC version of TC-025
  // ═══════════════════════════════════════════════════════════════════════════
  TC_046: {
    testCaseId: 'TC-046',
    scenarioId: 'S230_007_SDPC',
    title: 'SDPC Suspension End: Valid → Null',
    program: 'SDPC',
    decisionTablePath: 'S100(10)→S210→S230(7)→S310+S445(Col2)',
    transactionCount: 2,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(SUSP_START_SDPC),
      suspensionEndDate: fmt(SUSP_END_SDPC),
      newSuspensionEndDate: null,
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: fmt(SUSP_END_SDPC_MINUS1) },
      { label: 'Span-C', status: 'A', beginDate: fmt(SUSP_END_SDPC), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(SUSP_START_SDPC) },
      { label: 'Span-B', status: 'S', beginDate: fmt(SUSP_START_SDPC_PLUS1), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'A', status: 'I', description: 'Delete existing SDPC Span-C' },
      { sequence: 2, scenario: 'S445', type: 'A', status: 'S', description: 'Extend SDPC Span-B to 12/31/2299' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-047: SDPC End Date Later with Suspension — SDPC version of TC-028
  // ═══════════════════════════════════════════════════════════════════════════
  TC_047: {
    testCaseId: 'TC-047',
    scenarioId: 'S220_005b_SDPC',
    title: 'SDPC End Date Later with Suspension',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(5)→S350(1)→S360(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      suspensionStartDate: fmt(TC047_SUSP_START),
      suspensionEndDate: fmt(TC047_SUSP_END_SHORT),
      newSuspensionEndDate: fmt(TC047_NEW_SUSP_END),
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: fmt(TC047_SUSP_START) },
      { label: 'Span-B', status: 'S', beginDate: fmt(TC047_SUSP_END_SHORT), endDate: fmt(addDays(TC047_NEW_SUSP_END, -1)) },
      { label: 'Span-C', status: 'A', beginDate: fmt(TC047_NEW_SUSP_END), endDate: SENTINEL_END_DATE },
    ],
    transactions: [
      { sequence: 1, scenario: 'S360', type: 'A', status: 'A', description: 'Create SDPC post-suspension span' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-048: SDPC Disenrolled Span — Real Reason Code (S345) — SDPC version of TC-033
  // ═══════════════════════════════════════════════════════════════════════════
  TC_048: {
    testCaseId: 'TC-048',
    scenarioId: 'S220_008_SDPC',
    title: 'SDPC Disenrolled Span — Real Reason Code (S345)',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(8)→S345(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: fmt(ES_PLUS_3M_END),
      enrollmentStatus: 'Disenrolled',
      statusChange: 'Disenrolled',
      statusReason: 'Deceased',
      disenrollmentReason: 'Deceased',
    },
    mmisBefore: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    mmisAfter: [
      { label: 'Span-B', status: 'A', beginDate: fmt(ES), endDate: fmt(ES_PLUS_3M_END) },
    ],
    transactions: [
      { sequence: 1, scenario: 'S345', type: 'A', status: 'A', startReason: '64', stopReason: '64', description: 'Re-send SDPC closure with real reason code' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-049: SDPC Referral Withdrawn (Reset to Pristine) — SDPC version of TC-008
  // ═══════════════════════════════════════════════════════════════════════════
  TC_049: {
    testCaseId: 'TC-049',
    scenarioId: 'S220_006_SDPC',
    title: 'SDPC Referral Withdrawn (Reset to Pristine)',
    program: 'SDPC',
    decisionTablePath: 'S100(8)→S210→S220(6)→S310(Col2)',
    transactionCount: 1,
    expectedResponse: 'SU',
    bcInput: {
      enrollmentStartDate: fmt(ES),
      enrollmentEndDate: SENTINEL_END_DATE,
      statusChange: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    },
    mmisBefore: [
      { label: 'Span-A', status: 'A', beginDate: fmt(ES), endDate: SENTINEL_END_DATE },
    ],
    mmisAfter: [],
    transactions: [
      { sequence: 1, scenario: 'S310', type: 'A', status: 'I', description: 'Delete SDPC enrollment span (referral withdrawn)' },
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
