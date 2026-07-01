#!/usr/bin/env pwsh
# apply-mock-sync.ps1 — Adds MOCK_MMIS branch to sync verification tests
# for files that follow the "on detail page + poll" pattern

$basePath = "c:\Whitelisted\Projects\WiDHS\bc-tools-validation-helper\es-testing\tests\atc\enrollment"

# Each config: File, TC number, test name pattern to find the sync verification test
$configs = @(
    @{ File="TC-010-open-ended-suspension.spec.ts"; TC="TC-010"; TestPattern="ATC-ES-047" }
    @{ File="TC-012-suspension-deleted.spec.ts"; TC="TC-012"; TestPattern="ATC-ES-055" }
    @{ File="TC-013-suspension-end-null-to-valid.spec.ts"; TC="TC-013"; TestPattern="ATC-ES-059" }
    @{ File="TC-014-address-only-update.spec.ts"; TC="TC-014"; TestPattern="ATC-ES-063" }
    @{ File="TC-015-new-sdpc-enrollment.spec.ts"; TC="TC-015"; TestPattern="ATC-ES-067" }
    @{ File="TC-016-fea-transfer.spec.ts"; TC="TC-016"; TestPattern="ATC-ES-071" }
    @{ File="TC-017-ica-transfer-during-suspension.spec.ts"; TC="TC-017"; TestPattern="ATC-ES-075" }
    @{ File="TC-018-new-sdpc-suspension.spec.ts"; TC="TC-018"; TestPattern="ATC-ES-079" }
    @{ File="TC-019-enrollment-begin-date-changed.spec.ts"; TC="TC-019"; TestPattern="ATC-ES-083" }
    @{ File="TC-020-enrollment-begin-date-changed-later.spec.ts"; TC="TC-020"; TestPattern="ATC-ES-087" }
    @{ File="TC-021-suspension-begin-date-earlier.spec.ts"; TC="TC-021"; TestPattern="ATC-ES-091" }
    @{ File="TC-022-suspension-begin-date-later.spec.ts"; TC="TC-022"; TestPattern="ATC-ES-095" }
    @{ File="TC-023-suspension-end-date-earlier.spec.ts"; TC="TC-023"; TestPattern="ATC-ES-099" }
    @{ File="TC-024-suspension-end-date-later.spec.ts"; TC="TC-024"; TestPattern="ATC-ES-103" }
    @{ File="TC-025-suspension-end-date-valid-to-null.spec.ts"; TC="TC-025"; TestPattern="ATC-ES-107" }
    @{ File="TC-026-sdpc-enrollment-end-date-earlier.spec.ts"; TC="TC-026"; TestPattern="ATC-ES-111" }
    @{ File="TC-027-sdpc-suspension-deleted.spec.ts"; TC="TC-027"; TestPattern="ATC-ES-115" }
    @{ File="TC-028-end-date-later-with-active-suspension.spec.ts"; TC="TC-028"; TestPattern="ATC-ES-119" }
    @{ File="TC-031-ica-transfer-with-existing-span-c.spec.ts"; TC="TC-031"; TestPattern="ATC-ES-133" }
)

foreach ($cfg in $configs) {
    $filePath = Join-Path $basePath $cfg.File
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP (missing): $($cfg.File)"
        continue
    }
    
    $content = Get-Content $filePath -Raw
    $tc = $cfg.TC
    $testPattern = $cfg.TestPattern
    
    # Check if already has MOCK_MMIS branch in the sync test
    if ($content -match "if \(MOCK_MMIS\) \{[\s\S]*?Mock path") {
        Write-Host "SKIP (already done): $($cfg.File)"
        continue
    }
    
    # Find the test function that contains the polling loop
    # The pattern is: test('ATC-ES-XXX - ...', async () => {
    # followed by polling code with getSyncStatus
    
    # Strategy: Find the test block start, then find `const currentUrl = page.url();`
    # and insert the MOCK_MMIS branch before it
    
    # For files where the sync test starts with navigating to enrollments first (TC-014, TC-015, TC-016, TC-017, TC-031)
    # we need a different approach — find the line with `const currentUrl` inside that test
    
    # Simple approach: find the first occurrence of `const currentUrl = page.url();` 
    # that appears AFTER the test pattern name, and insert MOCK_MMIS before it
    
    # Find the test function containing the pattern
    $testNameEscaped = [regex]::Escape($testPattern)
    
    # Match from the test declaration to its closing
    if ($content -match "(?s)(test\('$testNameEscaped[^']*',\s*async\s*\(\)\s*=>\s*\{)(.*?)(\n\}\);)") {
        $testStart = $Matches[1]
        $testBody = $Matches[2]
        $testEnd = $Matches[3]
        
        # Build the mock branch
        $mockBranch = @"

  if (MOCK_MMIS) {
    // --- Mock path: Use database to set MMIS Success ---
    const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
    if (!enrollmentKey) {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
      const opened = await openFirstEnrollmentDetail(page);
      expect(opened).toBe(true);
    }
    const key = enrollmentKey || extractProgramEnrollmentKeyFromUrl(page.url());
    expect(key, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
    await page.waitForTimeout(5000);
    const mockResult = await mockMmisSuccess(key!);
    expect(mockResult, 'mockMmisSuccess failed --- stored procedure missing?').toBe(true);
    console.log(``[$tc] MMIS Success mocked for key: `${key}``);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const status = await getSyncStatus(page);
    expect(status.responseStatus).toBe('SU');
    expect(status.hasConflict).toBe(false);
  } else {
    // --- Real path: Poll for actual MMIS response ---
"@
        
        # Close the else block before the test end
        $newTestBody = "$mockBranch$testBody`n  }"
        $newTest = "$testStart$newTestBody$testEnd"
        
        # Replace in content
        $fullMatch = "$testStart$testBody$testEnd"
        $content = $content.Replace($fullMatch, $newTest)
        
        Set-Content $filePath $content -NoNewline
        Write-Host "UPDATED: $($cfg.File)"
    } else {
        Write-Host "NO-MATCH: $($cfg.File) (could not find test $testPattern)"
    }
}

Write-Host "`nDone!"
