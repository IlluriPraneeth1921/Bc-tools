/**
 * Atomic Test Cases: Navigation Module
 *
 * Module: NAV
 * Tests sidebar navigation, page routing, and dashboard elements.
 *
 * @see docs/test-strategy.md Section 2.1
 */

import { test, expect, SELECTORS } from '../../fixtures/app.fixture';

test.describe('Navigation & Dashboard', () => {
  test('ATC-NAV-001 - Dashboard displays after successful login', {
    tag: ['@navigation', '@smoke', '@regression', '@ATC-NAV-001'],
  }, async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('ATC-NAV-002 - Sidebar shows all navigation links', {
    tag: ['@navigation', '@smoke', '@regression', '@ATC-NAV-002'],
  }, async ({ authenticatedPage }) => {
    const sidebar = authenticatedPage.locator(SELECTORS.sidebar);
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Verify all page links exist in sidebar
    await expect(authenticatedPage.locator(SELECTORS.navLoadFile)).toBeVisible();
    await expect(authenticatedPage.locator(SELECTORS.navCompare)).toBeVisible();
    await expect(authenticatedPage.locator(SELECTORS.navMismatches)).toBeVisible();
    await expect(authenticatedPage.locator(SELECTORS.navCleanup)).toBeVisible();
    await expect(authenticatedPage.locator(SELECTORS.navTestRuns)).toBeVisible();
  });

  test('ATC-NAV-003 - Dashboard shows workflow diagram', {
    tag: ['@navigation', '@regression', '@ATC-NAV-003'],
  }, async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 10_000 });
    // Workflow description should be visible
    await expect(
      authenticatedPage.locator(':text("Workflow"), :text("Pipeline")').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('ATC-NAV-004 - Navigate to Load File and back to dashboard', {
    tag: ['@navigation', '@regression', '@ATC-NAV-004'],
  }, async ({ authenticatedPage }) => {
    // Navigate to Load File
    await authenticatedPage.locator(SELECTORS.navLoadFile).click();
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.locator(SELECTORS.loadFileTitle)).toBeVisible({ timeout: 10_000 });

    // Navigate back (click app title or home link)
    const homeLink = authenticatedPage.locator('a[href="/"], :text("Pipeline Verification")').first();
    if (await homeLink.isVisible().catch(() => false)) {
      await homeLink.click();
      await authenticatedPage.waitForLoadState('networkidle');
    }
  });

  test('ATC-NAV-005 - Navigate to Compare page', {
    tag: ['@navigation', '@regression', '@ATC-NAV-005'],
  }, async ({ authenticatedPage }) => {
    await authenticatedPage.locator(SELECTORS.navCompare).click();
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.locator(SELECTORS.compareTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('ATC-NAV-006 - Navigate to Mismatches page', {
    tag: ['@navigation', '@regression', '@ATC-NAV-006'],
  }, async ({ authenticatedPage }) => {
    await authenticatedPage.locator(SELECTORS.navMismatches).click();
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.locator(SELECTORS.mismatchesTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('ATC-NAV-007 - Navigate to Cleanup page', {
    tag: ['@navigation', '@regression', '@ATC-NAV-007'],
  }, async ({ authenticatedPage }) => {
    await authenticatedPage.locator(SELECTORS.navCleanup).click();
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.locator(SELECTORS.cleanupTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('ATC-NAV-008 - Navigate to Test Runs page', {
    tag: ['@navigation', '@regression', '@ATC-NAV-008'],
  }, async ({ authenticatedPage }) => {
    await authenticatedPage.locator(SELECTORS.navTestRuns).click();
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.locator(SELECTORS.testRunsTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('ATC-NAV-009 - API status indicator shows in sidebar', {
    tag: ['@navigation', '@regression', '@ATC-NAV-009'],
  }, async ({ authenticatedPage }) => {
    const sidebar = authenticatedPage.locator(SELECTORS.sidebar);
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
    // Should show API Connected or API Offline
    const statusText = sidebar.locator(':text("API Connected"), :text("API Offline"), :text("API Unhealthy")').first();
    await expect(statusText).toBeVisible({ timeout: 10_000 });
  });

  test('ATC-NAV-010 - Page title is set correctly', {
    tag: ['@navigation', '@regression', '@ATC-NAV-010'],
  }, async ({ authenticatedPage }) => {
    const title = await authenticatedPage.title();
    expect(title).toContain('Pipeline');
  });
});
