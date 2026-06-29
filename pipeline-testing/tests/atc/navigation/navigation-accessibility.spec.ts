/**
 * Atomic Test Cases: Accessibility (508 Compliance)
 *
 * Module: NAV (Accessibility)
 * Tests WCAG 2.1 AA compliance using axe-core integration.
 *
 * @see docs/test-strategy.md Section 4 (508 Plan)
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SELECTORS } from '../../fixtures/selectors';

test.describe('Accessibility — 508 Compliance', () => {
  test.beforeEach(async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:8501';
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  test('ATC-NAV-508-001 - Login page passes axe-core audit', {
    tag: ['@navigation', '@508', '@accessibility', '@ATC-NAV-508-001'],
  }, async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-testid="stDeployButton"]') // Streamlit internal
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('ATC-NAV-508-002 - Dashboard page passes axe-core audit', {
    tag: ['@navigation', '@508', '@accessibility', '@ATC-NAV-508-002'],
  }, async ({ page }) => {
    // Login first
    const username = process.env.PL_TEST_USERNAME || 'admin';
    const password = process.env.PL_TEST_PASSWORD || 'pltest2026';
    await page.locator(SELECTORS.usernameInput).fill(username);
    await page.locator(SELECTORS.passwordInput).fill(password);
    await page.locator(SELECTORS.loginButton).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-testid="stDeployButton"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('ATC-NAV-508-003 - Login form has proper keyboard navigation', {
    tag: ['@navigation', '@508', '@accessibility', '@ATC-NAV-508-003'],
  }, async ({ page }) => {
    // Tab through login form elements
    await page.keyboard.press('Tab');
    const activeElement1 = await page.evaluate(() => document.activeElement?.tagName);

    await page.keyboard.press('Tab');
    const activeElement2 = await page.evaluate(() => document.activeElement?.tagName);

    // At least input elements should be focusable via tab
    expect(['INPUT', 'BUTTON', 'TEXTAREA']).toContain(activeElement1);
    expect(['INPUT', 'BUTTON', 'TEXTAREA']).toContain(activeElement2);
  });

  test('ATC-NAV-508-004 - Form labels are associated with inputs', {
    tag: ['@navigation', '@508', '@accessibility', '@ATC-NAV-508-004'],
  }, async ({ page }) => {
    // Check that all visible inputs have associated labels or aria-label
    const inputs = page.locator('input:visible');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.getAttribute('aria-label');
      const hasLabelledBy = await input.getAttribute('aria-labelledby');
      const id = await input.getAttribute('id');

      // Input should have aria-label, aria-labelledby, or a matching <label>
      const isLabeled = hasLabel || hasLabelledBy || (id && await page.locator(`label[for="${id}"]`).count() > 0);
      expect(isLabeled).toBeTruthy();
    }
  });

  test('ATC-NAV-508-005 - Color contrast meets WCAG AA requirements', {
    tag: ['@navigation', '@508', '@accessibility', '@ATC-NAV-508-005'],
  }, async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
