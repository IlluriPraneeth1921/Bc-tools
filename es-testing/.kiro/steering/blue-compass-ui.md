---
inclusion: auto
---

# Blue Compass (Carity) UI Patterns & Selectors

Comprehensive reference for Playwright test automation of the Blue Compass Angular application. All selectors are verified against the live DOM.

---

## General Framework

- **Framework**: Angular with Angular Material (MDC-based components)
- **Component prefix**: `plr-` (Polaris custom), `app-` (app-level)
- **Material prefix**: `mat-mdc-*` for MDC-based Angular Material
- **Overlay container**: `.cdk-overlay-container` — all menus, dialogs, tooltips render here
- **URL routing**: Hash-based (`/#/persons/person/{uuid}/...`)
- **Base URL**: Set via `process.env.BASE_URL`

---

## 1. Login & Context Selection

### Cognito Login
```typescript
// Username/password form
const usernameInput = page.locator('#signInFormUsername');
const passwordInput = page.locator('#signInFormPassword');
const signInBtn = page.locator('input[name="signInSubmitButton"]');
```

### Acknowledge Dialog (appears after login)
```typescript
page.getByRole('button', { name: 'Acknowledge' }).click();
```

### Context Selection (Org/Location/Staff)
```typescript
// Autocomplete fields on choose-context page
input[id^="organization_"]   // Organization
input[id^="location_"]       // Location
input[id^="staffDelegation_"]  // Staff
// Then click "Log In" button
page.getByRole('button', { name: /log in/i }).click();
```

---

## 2. Navigation

| Destination | URL Pattern |
|-------------|-------------|
| Dashboard | `/#/persons/person/{uuid}/dashboard` |
| Enrollment List | `/#/persons/person/{uuid}/programenrollments` |
| Enrollment Detail | `/#/persons/person/{uuid}/programenrollments/programenrollment/{enrollmentKey}` |
| MMIS Snapshot | `/#/persons/person/{uuid}/record/mmis-data` |
| Addresses | `/#/persons/person/{uuid}/record/addresses` |

### Global Search
```typescript
const searchInput = page.locator('input[placeholder="Search Persons"]');
await searchInput.fill(query);
await searchInput.press('Enter');
// Double-click first result row
await page.locator('mat-row').first().dblclick();
```

---

## 3. Enrollment List (mat-table)

```typescript
// All enrollment rows
page.locator('mat-row')

// Row text contains: Program | Primary | Status | Sync Status | Status Reason | Dates
// Example: "IRIS No Suspended Success Moved to ineligible setting 07/01/2026 12/31/2299"

// Open detail — double-click a row
await page.locator('mat-row').filter({ hasText: /Enrolled/ }).first().dblclick();
// URL changes to: /programenrollments/programenrollment/{guid}

// Detect IRIS state from row text:
if (rowText.includes('Suspended')) → 'Suspended'
if (rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) → 'Enrolled'
if (rowText.includes('Referred')) → 'Referred'
if (rowText.includes('Draft')) → 'Draft'
if (rowText.includes('Disenrolled')) → 'Disenrolled'
```

---

## 4. Create New Enrollment (Dialog)

### Open Dialog
```typescript
await page.getByText('New Program Enrollment').click();
// Verify: mat-dialog-container becomes visible
```

### Form Fields (all mat-autocomplete inputs)
```typescript
input[aria-label="Program"]        // IRIS, SDPC
input[aria-label="Status"]         // Draft, Referred, Enrolled, Disenrolled
input[aria-label="Status Reason"]  // Not Applicable, IRIS Consultant, etc.
input[aria-label="Primary Program"] // Checkbox
input[id^="startDate_"]            // Start Date (MM/DD/YYYY)
input[id^="endDate_"]              // End Date (MM/DD/YYYY)
```

### Save Button
```typescript
// In dialog context:
page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first()
// Or:
page.locator('.cdk-overlay-pane button').filter({ hasText: /^Save$/ }).first()
```

### Error Detection
```typescript
// If dialog still visible after save → validation errors
const matErrors = page.locator('mat-error');
```

---

## 5. Edit Enrollment (Pencil Icon → Dialog)

### Open Edit Dialog
```typescript
// Pencil icon on enrollment detail page Overview section
const pencil = page.locator('button.mat-icon-button:has(mat-icon:text("edit"))').first();
await pencil.click();
// Retry up to 3 times if mat-dialog-container doesn't appear
```

### Fields in Edit Dialog
Same as Create dialog: Status, Status Reason, Start/End Date autocomplete/inputs.

**CRITICAL — Status Options in Edit Dialog Are LIMITED:**
- The Edit Enrollment dialog (pencil icon) only offers: **"Enrolled"** and **"Referral Withdrawn"**
- **"Disenrolled" is NOT available** in the edit dialog
- To set a "Disenrolled" status, use **"+ New Program Enrollment"** button instead (see Section 5a)
- To trigger an MMIS closure (S340), just set the End Date via the edit dialog — the MMIS transaction fires based on the end date change, not the status field

### Dismiss Warning Banner (if present)
```typescript
const closeBanner = page.locator('mat-dialog-container button').filter({ hasText: /^close$/ }).first();
if (await closeBanner.isVisible()) await closeBanner.click();
```

---

## 5a. Enrollment Status Change Patterns

### Setting End Date (Disenrollment trigger — TC-006)
To trigger an MMIS disenrollment (S340 closure transaction), you must create a NEW enrollment record with "Disenrolled" status via the "+ New Program Enrollment" button. The edit dialog (pencil icon) does NOT offer "Disenrolled" as a status option.

**Correct Flow:**
1. Navigate to enrollment list
2. Click **"+ New Program Enrollment"** button
3. Set Program = "IRIS", Status = "Disenrolled", Status Reason = "Not Applicable"
4. Set End Date to the desired earlier date
5. Save → triggers S340 MMIS closure transaction

```typescript
// Navigate to enrollment list
await navigateToEnrollments(page, participantUuid);
// Click + New Program Enrollment
await page.getByText('New Program Enrollment').first().click();
await page.waitForTimeout(3000);
// Set Status to Disenrolled (available in Create dialog, NOT in Edit dialog)
const statusInput = page.locator('input[aria-label="Status"]').first();
await statusInput.click({ force: true });
await statusInput.fill('', { force: true });
await statusInput.fill('Disenrolled', { force: true });
await page.waitForTimeout(2000);
const statusOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/i }).first();
await statusOpt.click();
// Set end date
const endDateInput = page.locator('input[id^="endDate_"]').first();
await endDateInput.click({ force: true });
await endDateInput.fill('', { force: true });
await endDateInput.pressSequentially('09/30/2026', { delay: 50 });
await endDateInput.press('Tab');
// Save
const saveBtn = page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
await saveBtn.click({ force: true });
```

### Creating Disenrolled Enrollment (via + New Program Enrollment)
To explicitly create an enrollment with "Disenrolled" status:
1. Navigate to enrollment list page
2. Click **"+ New Program Enrollment"** button
3. In the Create dialog, set Status to "Disenrolled"
4. Fill required fields (Program, Status Reason, Start Date, End Date)
5. Save

```typescript
// Click + New Program Enrollment
await page.getByText('New Program Enrollment').click();
await page.waitForTimeout(2000);
// Set fields in create dialog
const statusInput = page.locator('input[aria-label="Status"]').first();
await statusInput.click({ force: true });
await statusInput.fill('', { force: true });
await statusInput.fill('Disenrolled', { force: true });
await page.waitForTimeout(1500);
const statusOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/i }).first();
await statusOpt.click();
```

### Changing Begin Date (TC-019, TC-020)
To change an enrollment's begin date (triggers S310 delete + S300 recreate):
1. Open Edit dialog via pencil icon
2. Change the Start Date field
3. Save

```typescript
const startDateInput = page.locator('mat-dialog-container input[id^="startDate_"], mat-dialog-container input[id*="startDate"], mat-dialog-container input[aria-label*="Start Date"]').first();
await startDateInput.click({ force: true });
await startDateInput.fill('', { force: true });
await startDateInput.pressSequentially('06/15/2026', { delay: 50 });
await startDateInput.press('Tab');
```

### Key Insight: MMIS Transactions Trigger by Field Change, Not Status
- **End date set/changed** → S340 (closure) or S350 (extend) — status stays "Enrolled"
- **Begin date changed** → S310 (delete) + S300 (recreate) — status stays "Enrolled"  
- **Status → Referral Withdrawn** → S310 (delete) — via edit dialog
- **Status → Disenrolled** → Only via "+ New Program Enrollment" button

---

## 6. Suspension Management (Enrollment Detail Page)

### Section Location
```typescript
// Heading uses plr-info-icon component
const suspHeading = page.locator('span:text("Suspensions")').first();
await suspHeading.scrollIntoViewIfNeeded();
```

### Add Suspension
```typescript
// Click "+ Add Suspension" link/button
const addBtn = page.locator('button, a, span').filter({ hasText: /\+?\s*Add Suspension/i }).first();
await addBtn.click();
// May open mat-dialog-container OR inline form
```

### Suspension Form Fields (Dialog or Inline)
```typescript
// Start Date:
mat-dialog-container input[id*="startDate"]
mat-dialog-container input[aria-label*="Start"]

// End Date:
mat-dialog-container input[id*="endDate"]
mat-dialog-container input[aria-label*="End"]

// Reason (autocomplete):
mat-dialog-container input[aria-label*="Reason"]
```

### Delete Suspension
```typescript
// 1. Click the row's three-dot menu button
const suspMenuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
await suspMenuBtn.click();

// 2. Click "Delete" from context menu (in overlay)
const deleteItem = page.locator('.mat-mdc-menu-content button[mat-menu-item]').filter({ hasText: 'Delete' });
await deleteItem.click();

// 3. Confirm in dialog — button text is "Continue" (NOT "Confirm/Yes/OK/Delete")
const dialog = page.locator('mat-dialog-container');
await dialog.locator('button').filter({ hasText: /Continue/i }).first().click();
```

### Edit Suspension
```typescript
// Same three-dot menu, click "Edit" instead of "Delete"
const editItem = page.locator('.mat-mdc-menu-content button[mat-menu-item]').filter({ hasText: 'Edit' });
await editItem.click();
// Opens edit form/dialog for suspension dates
```

---

## 7. Context Menu (Three-Dot / more_vert)

### Two Types of more_vert Buttons

| Type | Selector | aria-label | Location |
|------|----------|------------|----------|
| Top nav | `button:has(mat-icon:text("more_vert"))` | "more options" | Header bar |
| Row-level (suspension, metadata tables) | `button.ellipse-action-menu` | "Expand menu" | Table rows |

### Menu Structure (renders in overlay)
```typescript
// Menu panel
.cdk-overlay-container .mat-mdc-menu-panel

// Menu items
.mat-mdc-menu-content button[mat-menu-item]
// Each item: <mat-icon>{icon}</mat-icon> + <span class="mat-mdc-menu-item-text"> Label </span>

// Filter by text:
page.locator('.mat-mdc-menu-content button[mat-menu-item]').filter({ hasText: 'Edit' })
page.locator('.mat-mdc-menu-content button[mat-menu-item]').filter({ hasText: 'Delete' })
```

---

## 8. Confirmation Dialog

When a destructive action is triggered (Delete suspension, etc.):

```
Component: plr-confirmation-dialog > plr-dialog-layout
Container: mat-dialog-container
Title: "Confirmation"
Message: "Are you sure you would like to remove this record?"
Confirm button: "Continue" (class: plr-primary-button)
Cancel button: "Cancel" (class: plr-neutral-button)
Close X: button[aria-label="close dialog"] with mat-icon "close"
```

**IMPORTANT**: The confirm button text is **"Continue"**, not "Confirm/Yes/OK/Delete".

```typescript
const dialog = page.locator('mat-dialog-container');
await dialog.locator('button').filter({ hasText: /Continue/i }).first().click();
```

---

## 9. Autocomplete Pattern (Shared)

All dropdown fields in Blue Compass use `mat-autocomplete`:

```typescript
async function fillAutocomplete(page: Page, ariaLabel: string, value: string) {
  const input = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  await input.click({ force: true });
  await page.waitForTimeout(300);
  await input.fill('', { force: true });
  await input.fill(value, { force: true });
  await page.waitForTimeout(1500);
  const option = page.locator('mat-option').filter({ hasText: new RegExp(value, 'i') }).first();
  await option.click();
  await page.waitForTimeout(500);
}
```

For readonly inputs (like context selection), use evaluate to remove readonly first:
```typescript
await page.evaluate((sel) => {
  const el = document.querySelector(sel) as HTMLInputElement;
  if (el) { el.removeAttribute('readonly'); el.focus(); el.click(); }
}, selector);
```

---

## 10. Date Input Pattern (Shared)

Date fields use `input[id^="startDate_"]` / `input[id^="endDate_"]`:

```typescript
const dateInput = page.locator('input[id^="startDate_"]').first();
await dateInput.click({ force: true });
await dateInput.fill('', { force: true });
await dateInput.pressSequentially('07/01/2026', { delay: 50 });
await dateInput.evaluate(el => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
});
await dateInput.press('Tab');
```

**IMPORTANT**: Must dispatch input/change/blur events AND press Tab to trigger Angular validation.

---

## 11. MMIS Transaction List (Enrollment Detail)

Located at the bottom of the enrollment detail page.

```typescript
// Section heading
page.getByText('MMIS Transaction List')

// Status badge (green "Success", yellow "Warning", red "Failed")
// Detected by text content on page

// Refresh button
page.locator('button').filter({ hasText: /Refresh/i })

// Re-submit button (visible only on conflict)
page.getByText('Re-submit')

// Status detection from page text:
/\bSU\b/ → Success
/\bSE\b/ → Success with Errors (Warning)
/\bFL\b/ → Failed
/Synchronization Pending/i → Still processing
/\bSuccess\b|\bSucceeded\b/i → SU (human-readable)
```

### Polling for Sync Completion
```typescript
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  await page.goto(currentUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  const status = await getSyncStatus(page);
  if (status.responseStatus !== null) break;
  await page.waitForTimeout(pollInterval);
}
```

---

## 12. MMIS Snapshot Page

```typescript
// Navigate
await page.goto(`${BASE}/#/persons/person/${uuid}/record/mmis-data`);

// Click Refresh to get latest data
await page.locator('button').filter({ hasText: /Refresh/i }).first().click();

// Check for empty state
pageText.includes('No Waiver Enrollment record(s) available')

// Parse waiver table rows
page.locator('table tr, mat-row')
// Columns: Waiver Program | Waiver Agency | Effective Date | End Date | Waiver Status
```

---

## 13. Address Update (Person Record — TC-014)

Address updates are done on the **Person Profile** page, not the enrollment detail page.

### Navigation
```typescript
// Person → Profile tab (left sidebar) → Addresses section
await page.goto(`${BASE}/#/persons/person/${uuid}/record/profile`);
// OR click "Person" in left nav, then "Profile" sub-item
```

### URL Pattern
```
/#/persons/person/{uuid}/record/profile
```

### Page Structure
- Left sidebar: Profile | Contacts | Employment | Cost Share | Budget Ledgers | MMIS Snapshot
- Main content: Profile page with "Addresses" section (collapsible, marked with ▼ Addresses)
- Address card shows: Source, Date Range, Street, City/State/Zip, County, Lat/Long, Address Type

### Edit Address Flow
1. **Hover over address card** — a pencil (edit) icon appears on hover
2. **Click pencil icon** — opens "Edit Address" dialog/panel (NOT a mat-dialog — it's an inline edit panel or slide-out)
3. **Edit "Street Address 1"** field — contains the street value (e.g., "66 E Brooklyn St")
4. **Click Save** — saves and triggers S700 if enrollment is active

### Edit Address Selectors
```typescript
// Navigate to profile
await page.goto(`${BASE}/#/persons/person/${uuid}/record/profile`);
await page.waitForLoadState('networkidle');

// Wait for Addresses section
const addressSection = page.locator('text=Addresses').first();
await addressSection.scrollIntoViewIfNeeded();

// Hover over the address card to reveal the edit pencil
const addressCard = page.locator('text=66 E Brooklyn St').first().locator('xpath=ancestor::*[4]');
await addressCard.hover();
await page.waitForTimeout(500);

// Click pencil/edit icon (appears on hover)
const editBtn = page.locator('button:has(mat-icon:text("edit"))').first();
await editBtn.click({ force: true });
await page.waitForTimeout(2000);

// Edit "Street Address 1" field in the Edit Address form
// The field label is "Street Address 1*" (required)
const streetInput = page.locator('input').filter({ has: page.locator('xpath=preceding-sibling::*[contains(text(),"Street Address 1")]') }).first();
// Alternative selectors for the street field:
//   page.getByLabel('Street Address 1')
//   page.locator('input[aria-label*="Street Address"]')

// Modify the value (toggle a char to trigger change detection)
const currentValue = await streetInput.inputValue();
const newValue = currentValue.endsWith('.') ? currentValue.slice(0, -1) : currentValue + '.';
await streetInput.fill(newValue);

// Save
await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(3000);
```

### Edit Address Dialog Fields
```
Title: "Edit Address"
Fields:
  - Address Type* (dropdown): Residential
  - Current* (dropdown): Yes
  - Date Range: Start Date / End Date (MM/DD/YYYY)
  - Street Address 1* (text input): "66 E Brooklyn St"
  - Street Address 2 (text input)
  - Care Of (text input)
  - City* (text input): "Chilton"
  - State/Province* (dropdown): "Wisconsin"
  - County Area (dropdown): "Calumet County"
Buttons: Save | Cancel
```

### Important Notes
- The edit icon only appears on **hover** — use `element.hover()` before clicking
- After saving, the S700 transaction is triggered if the participant has an active enrollment with a current MMIS span
- The address edit is on the Person Profile page, NOT the enrollment detail page
- After address save, navigate back to enrollment detail to verify MMIS sync status

---

## 14. ICA/FEA Transfer (Location Assignment)

```typescript
// Navigate to ICA/FEA assignment section (exact navigation TBD — varies by app version)
// Click Transfer/New Assignment
page.getByText(/Transfer|New.*Assignment|Change.*Agency/i)

// Select new agency via autocomplete
input[aria-label*="Agency"] or input[aria-label*="ICA"] or input[aria-label*="Location"]
```

---

## 15. Key Timing Notes

| Action | Wait Time |
|--------|-----------|
| After page navigation | `networkidle` + 2-3s extra |
| After clicking menu button | 500ms-1s for overlay |
| After dialog save | 3-5s for async processing |
| Date input after type | 500ms + Tab |
| Autocomplete after type | 1-1.5s for options to load |
| After enrollment save | 5s + networkidle |
| MMIS sync poll interval | 10s between attempts |
| Element visibility timeout | 10-15s minimum |
| Edit dialog retry | Up to 3 attempts, 3s between |

---

## 16. Error Handling Patterns

```typescript
// Validation errors in dialogs
page.locator('mat-error')

// Snackbar/toast messages
page.locator('.mat-mdc-snack-bar-container, simple-snack-bar')

// Conflict indicators
page.locator('[class*="conflict"], [class*="error-badge"]').filter({ hasText: /conflict|error|FL/i })

// Dialog still open after save = error occurred
const stillOpen = await page.locator('mat-dialog-container').isVisible({ timeout: 3_000 });
```

---

## 17. Verification Patterns (Working Test Cases)

These patterns are confirmed working across TC-001 through TC-009, TC-014, and TC-032.

### Verify MMIS Sync Completed (Success Path)
```typescript
// Poll enrollment detail page for sync response
const maxAttempts = 6;  // or 12 for multi-transaction scenarios
const pollInterval = 10_000;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  status = await getSyncStatus(page);
  if (status.responseStatus !== null) break;
  if (attempt < maxAttempts) await page.waitForTimeout(pollInterval);
}
expect(status.responseStatus).toMatch(/^(SU|SE)$/);
expect(status.hasConflict).toBe(false);
```

### Verify MMIS Failure (FL Response — TC-004)
```typescript
expect(status.responseStatus).toBe('FL');

// Conflict badge visible
const conflictVisible = await hasConflictBadge(page);
expect(conflictVisible).toBe(true);

// Specific error code visible on page
const pageText = await page.locator('main').textContent() || '';
expect(pageText).toContain('9156'); // or other error code

// Re-submit button is visible (only on conflict)
const resubmitVisible = await isResubmitVisible(page);
expect(resubmitVisible).toBe(true);
```

### Verify No Transaction Sent (TC-011, TC-032 — Negative Tests)
```typescript
// For disenrolled participants or invalid suspension length:
const status = await getSyncStatus(page);
expect(status.hasConflict).toBe(false);
// No new transactions should appear — responseStatus stays null or unchanged
```

### Verify Enrollment Row State on List
```typescript
await navigateToEnrollments(page, participantUuid);
await page.waitForTimeout(2000);
const firstRow = page.locator('mat-row').first();
await expect(firstRow).toBeVisible({ timeout: 15_000 });
const rowText = await firstRow.textContent() || '';
expect(rowText).toContain('IRIS');
expect(rowText).toContain('Enrolled');  // or 'Suspended', 'Disenrolled'
// Sync badge check:
expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
```

### Verify Enrollment Detail Opened Successfully
```typescript
const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
await enrolledRow.dblclick();
await page.waitForURL(/\/programenrollments\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
await page.waitForTimeout(3000);
await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
expect(page.url()).toMatch(/\/programenrollments\/programenrollment\/[0-9a-f-]+/i);
```

### Verify MMIS Transaction List Visible
```typescript
await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });
```

### Verify Transaction Row Count
```typescript
const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
const count = await transactionRows.count();
expect(count).toBeGreaterThanOrEqual(expectedCount);
```

### Helper Functions (from enrollment.actions.ts)
```typescript
// hasConflictBadge — checks for visible conflict/error badge
page.locator('[class*="conflict"], [class*="error-badge"], [class*="chip"]')
  .filter({ hasText: /conflict|error|FL/i })
  .first().isVisible({ timeout: 5_000 })

// isResubmitVisible — checks if Re-submit button shows
page.getByText('Re-submit').isVisible({ timeout: 5_000 })

// getMMISErrors — reads error text from MMIS section
page.locator('[class*="error"], [class*="conflict"], mat-cell')
  // Filter for text containing error codes or "Error"/"FL"

// openFirstEnrollmentDetail — double-clicks first mat-row
page.locator('mat-row').first().dblclick()
// Returns true if URL contains /programenrollment/
```

---

## 18. Test Structure Pattern

All ATC tests follow this structure:
```typescript
test.describe.serial('TC-XXX: Title', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

  test('Step 1 - Precondition check', async () => { /* ... */ });
  test('Step 2 - Perform action', async () => { /* ... */ });
  test('Step 3 - Verify MMIS sync', async () => { /* ... */ });
  test('Step 4 - Verify response/no conflict', async () => { /* ... */ });
});
```

---

## 19. MMIS Mock (Database Bypass)

When the real MMIS system is unavailable, use the database helper to mock success responses:

```typescript
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// After triggering a sync action (create enrollment, add suspension, etc.):
// 1. Extract the ProgramEnrollmentKey from the detail page URL
const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());

// 2. Call the mock to set MMIS response to Success
const success = await mockMmisSuccess(enrollmentKey!);
expect(success).toBe(true);

// 3. Refresh the page to pick up the new status
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// 4. Verify the UI now shows Success
const status = await getSyncStatus(page);
expect(status.responseStatus).toBe('SU');
```

### When to use mock vs real MMIS:
- **Use mock**: When MMIS is down, for faster test execution, or when testing UI behavior independent of MMIS
- **Use real MMIS**: For end-to-end validation of the full sync pipeline, payload verification

### Important:
- Always call `closeDb()` in `test.afterAll()` to clean up the connection pool
- The stored procedure `[dbo].[test_SetMMISStatusSuccess]` must exist in the database
- If it's missing, the helper logs a clear error message during test execution

---

## 20. Maintenance & Self-Update Policy

> **IMPORTANT**: When writing or debugging tests and you discover a UI pattern, selector,
> or interaction flow that is NOT documented in this file, **update this steering file
> immediately** with the new pattern. Include:
> - The verified selector/locator
> - The context where it's used (which page, which component)
> - Any timing notes or gotchas
> - Which test case verified it
>
> This keeps the file as the single source of truth for Blue Compass UI automation.
> Patterns should only be added here after they are confirmed working against the live app
> (via a passing test or debug run with DOM capture).
>
> **Never guess selectors.** If a selector isn't documented here, run a debug test to
> capture the actual DOM structure first, then add the verified pattern to this file.
