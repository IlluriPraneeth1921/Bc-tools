/**
 * Shared Selectors — Pipeline Testing UI (Streamlit)
 *
 * Centralized selector constants for Streamlit-rendered elements.
 * Streamlit uses specific DOM patterns (iframes, shadow DOM, data-testid attributes).
 */

export const SELECTORS = {
  // ─── Authentication ────────────────────────────────────────────────────────
  loginTitle: 'text=pl-test — Login',
  usernameInput: 'input[aria-label="Username"]',
  passwordInput: 'input[aria-label="Password"]',
  loginButton: 'button:has-text("Login")',
  loginError: 'div[data-testid="stAlert"]:has-text("Invalid")',

  // ─── Navigation / Sidebar ──────────────────────────────────────────────────
  sidebar: '[data-testid="stSidebar"]',
  sidebarNav: '[data-testid="stSidebarNav"]',
  navLoadFile: 'a:has-text("Load File")',
  navCompare: 'a:has-text("Compare")',
  navMismatches: 'a:has-text("Mismatches")',
  navCleanup: 'a:has-text("Cleanup")',
  navTestRuns: 'a:has-text("Test Runs")',
  apiConnectedBadge: '[data-testid="stSidebar"] :text("API Connected")',
  apiOfflineBadge: '[data-testid="stSidebar"] :text("API Offline")',

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboardTitle: 'text=Pipeline Verification Dashboard',
  workflowDiagram: 'pre:has-text("Existing Pipeline")',

  // ─── Load File Page ────────────────────────────────────────────────────────
  loadFileTitle: ':text("Load File")',
  interfaceTypeSelect: '[data-testid="stSelectbox"]',
  fileUploader: '[data-testid="stFileUploader"]',
  s3FileList: '[data-testid="stDataFrame"]',
  parseSummary: ':text("total_providers")',
  providerCount: ':text("total_providers")',

  // ─── Compare Page ──────────────────────────────────────────────────────────
  compareTitle: ':text("Compare")',
  compareButton: 'button:has-text("Compare")',
  compareRunning: ':text("Running")',
  stageProgress: ':text("Stage")',
  compareComplete: ':text("Complete")',

  // ─── Mismatches Page ───────────────────────────────────────────────────────
  mismatchesTitle: ':text("Mismatches")',
  mismatchTable: '[data-testid="stDataFrame"]',
  stageFilter: '[data-testid="stSelectbox"]',
  exportCsvButton: 'button:has-text("CSV")',
  passCount: ':text("Pass")',
  failCount: ':text("Fail")',

  // ─── Cleanup Page ──────────────────────────────────────────────────────────
  cleanupTitle: ':text("Cleanup")',
  cleanupButton: 'button:has-text("Cleanup")',
  cleanupSuccess: ':text("removed")',
  entityIdPrefixInput: 'input[aria-label*="prefix" i], input[aria-label*="Prefix" i], input[aria-label*="MCD" i]',

  // ─── Test Runs Page ────────────────────────────────────────────────────────
  testRunsTitle: ':text("Test Runs")',
  testRunsTable: '[data-testid="stDataFrame"]',
  testRunStatus: ':text("PASS"), :text("FAIL"), :text("PENDING")',

  // ─── General Streamlit Elements ────────────────────────────────────────────
  stApp: '[data-testid="stApp"]',
  stHeader: '[data-testid="stHeader"]',
  spinner: '[data-testid="stSpinner"]',
  successAlert: '[data-testid="stAlert"]:has([data-testid="stAlertContentSuccess"])',
  errorAlert: '[data-testid="stAlert"]:has([data-testid="stAlertContentError"])',
  warningAlert: '[data-testid="stAlert"]:has([data-testid="stAlertContentWarning"])',
};
