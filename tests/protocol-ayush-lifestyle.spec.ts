import { test, expect } from '@playwright/test';
import { INITIAL_AYUSH_REMEDIES } from '../src/data/ayushRemedies';

async function loginAndConsent(page: any) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const demoBtn = page.locator('#btn-quick-demo-login');
  if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await demoBtn.click();
  }

  const consent = page.locator('#disclaimer-checkbox');
  if (await consent.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consent.check();
    await page.locator('#btn-agree-and-continue').click();
  }

  await page.waitForSelector('#dashboard-view, #header-scenario-select', { timeout: 8000 }).catch(() => {});

  const closeBuilderBtn = page.locator('#btn-close-profile-builder-modal');
  if (await closeBuilderBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await closeBuilderBtn.click();
  }
}

test.describe('Master Protocol: AYUSH Dietary Recipes, Habits & Clinical Scenarios (AYU-DIET, LFS-TRK, SMP-PRF, STG-PRG)', () => {

  test('AYU-DIET-01 & 02 & 04: Verified Whole-Food Recipes, Safety Notes, and Research Citations', () => {
    // Verify all 11 verified whole food dietary items
    const remedyIds = INITIAL_AYUSH_REMEDIES.map((r) => r.id);
    expect(remedyIds).toContain('moringa-leaves-extract');
    expect(remedyIds).toContain('nagaphani-fruit-juice');
    expect(remedyIds.some((id) => id.includes('raisins') || id.includes('draksha') || id.includes('jaggery'))).toBe(true);
    expect(remedyIds.some((id) => id.includes('ginger') || id.includes('shunthi'))).toBe(true);
    expect(remedyIds).toContain('niger-seeds-chutney');
    expect(remedyIds.some((id) => id.includes('purslane'))).toBe(true);
    expect(remedyIds.some((id) => id.includes('oyster-mushroom'))).toBe(true);
    expect(remedyIds.some((id) => id.includes('laja-manda'))).toBe(true);
    expect(remedyIds.some((id) => id.includes('takra') || id.includes('buttermilk'))).toBe(true);
    expect(remedyIds.some((id) => id.includes('wheatgrass'))).toBe(true);
    expect(remedyIds).toContain('mahua-flower-laddoo');

    // Verify Moringa safety timing warning (2 hours from tea/coffee/milk)
    const moringa = INITIAL_AYUSH_REMEDIES.find((r) => r.id === 'moringa-leaves-extract')!;
    expect(moringa.optimalTiming).toMatch(/separated by 2 hours from tea\/coffee/i);
    expect(moringa.researchLinks.length).toBeGreaterThanOrEqual(1);
    expect(moringa.researchLinks[0].url).toContain('ayush.gov.in');

    // Verify Niger seeds chutney iron richness and study
    const niger = INITIAL_AYUSH_REMEDIES.find((r) => r.id === 'niger-seeds-chutney')!;
    expect(niger.clinicalEvidence).toContain('56.7 mg iron');
    expect(niger.officialAyushLink).toContain('ayush.gov.in');
  });

  test('AYU-DIET-UI: AYUSH Wellness View Rendering & Sourcing Spotlight', async ({ page }) => {
    await loginAndConsent(page);

    const navBtn = page.locator('#sidebar-nav-ayush, #mobile-nav-ayush').first();
    await expect(navBtn).toBeVisible({ timeout: 5000 });
    await navBtn.click();
    await page.waitForTimeout(500);

    // Verify Shilparamam authentic sourcing banner and remedy cards
    const sourcingBanner = page.locator('#shilparamam-sourcing-spotlight');
    await expect(sourcingBanner).toBeVisible({ timeout: 8000 });
    await expect(sourcingBanner).toContainText(/Shilparamam Crafts Village/i);

    // Verify Moringa and Nagaphani cards are present
    const moringaTitle = page.locator('text=Moringa Leaves & Jaggery');
    await expect(moringaTitle.first()).toBeVisible({ timeout: 5000 });
  });

  test('SMP-PRF-01: Clinical Sample Profiles Switching & Cascade Recalculation', async ({ page }) => {
    await loginAndConsent(page);

    // Switch scenario dropdown to Sunita Devi (Pregnant, Severe IDA, Hb 6.5)
    const select = page.locator('#header-scenario-select, #sidebar-scenario-select').first();
    await expect(select).toBeVisible({ timeout: 8000 });
    await select.selectOption('emergency-alert-demo');

    // Verify emergency triage banner immediately triggers
    const emergencyBanner = page.locator('#emergency-triage-banner');
    await expect(emergencyBanner).toBeVisible({ timeout: 5000 });

    // Switch to Meera (Optimal Health, Hb 13.5)
    await select.selectOption('meera-restored');
    await page.waitForTimeout(400);
    // Emergency banner should no longer show
    await expect(emergencyBanner).not.toBeVisible({ timeout: 5000 });

    // Switch to Priya (Adolescent)
    await select.selectOption('priya-pediatric');
    await page.waitForTimeout(300);
  });

  test('STG-PRG-01: Stage Progression Navigation Footer', async ({ page }) => {
    await loginAndConsent(page);

    // Verify Stage Progression Footer is present on dashboard
    const stageFooter = page.locator('#stage-progression-footer');
    await expect(stageFooter).toBeVisible({ timeout: 8000 });

    // Click continue protocol button
    const continueBtn = page.locator('#btn-footer-continue-protocol');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();
    await page.waitForTimeout(500);

    // Should transition to Stage 1: Health Vector
    const healthVector = page.locator('#health-vector-view');
    await expect(healthVector).toBeVisible({ timeout: 8000 });
  });

  test('FLT-CHT-01: Floating "Ask Maguva" Companion Button Toggles to AI Chat', async ({ page }) => {
    await loginAndConsent(page);

    // Verify floating companion button is present on dashboard
    const floatingBtn = page.locator('#floating-ask-maguva-btn');
    await expect(floatingBtn).toBeVisible({ timeout: 5000 });

    // Click floating button
    await floatingBtn.click();
    await page.waitForTimeout(400);

    // Should navigate to AI Chat Companion view
    const chatInput = page.locator('#companion-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 8000 });
  });

  test('AUD-SYS-03: Responsive Design & Mobile Viewport Compatibility', async ({ page }) => {
    // Set viewport to mobile size (iPhone 14 / Pixel 7: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAndConsent(page);

    // Verify mobile layout renders cleanly without errors
    const mainContent = page.locator('main, #dashboard-view');
    await expect(mainContent.first()).toBeVisible({ timeout: 8000 });
  });

});
