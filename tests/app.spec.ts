import { test, expect, Page } from '@playwright/test';

// Helper to authenticate as test patient Bhavana and bypass disclaimer
async function ensureAuthenticated(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // If on Auth screen, click Demo Sign In
  const demoBtn = page.locator('#btn-quick-demo-login');
  if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await demoBtn.click();
    await page.waitForTimeout(500);
  }

  // If on DisclaimerView screen, accept consent
  const consentCheckbox = page.locator('#disclaimer-checkbox');
  if (await consentCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consentCheckbox.check();
    await page.locator('#btn-agree-and-continue').click();
    await page.waitForTimeout(500);
  }

  // If profile modal is open, close/dismiss it
  const closeProfileBtn = page.locator('#btn-close-profile-builder-modal');
  if (await closeProfileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeProfileBtn.click();
    await page.waitForTimeout(300);
  }

  // Confirm sidebar is loaded
  await expect(page.locator('#sidebar-nav-dashboard')).toBeVisible({ timeout: 10000 });
}

test.describe('Maguva Health - End-to-End Automated Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('Module 1: User Authentication & Forgot Password Redirection', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Sign In screen elements & Forgot Password
    const forgotBtn = page.locator('#btn-forgot-password-link');
    if (await forgotBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await forgotBtn.click();
      const resetEmailInput = page.locator('#forgot-email');
      await expect(resetEmailInput).toBeVisible();

      // Submit password reset
      await resetEmailInput.fill('bhavana.test@gmail.com');
      await page.locator('button:has-text("Reset Password")').first().click();

      // Verify success notification or countdown is displayed
      const notice = page.locator('text=/sent to your email|Redirecting in|No account found/i');
      await expect(notice.first()).toBeVisible({ timeout: 8000 });
    }

    // 2. Authenticate and enter dashboard
    await ensureAuthenticated(page);
    await expect(page.locator('#sidebar-nav-dashboard')).toBeVisible();
  });

  test('Module 2: Food Library Search & Existing Curated Items', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to Meal Planner & Foods via Sidebar
    await page.locator('#sidebar-nav-meals').click();
    await page.waitForTimeout(500);

    // Search input
    const searchInput = page.locator('#input-search-foods, input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 1. Search Ragi
    await searchInput.fill('Ragi');
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Ragi/i').first()).toBeVisible({ timeout: 5000 });

    // 2. Search Chana Saag
    await searchInput.fill('Chana Saag');
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Chana Saag/i').first()).toBeVisible({ timeout: 5000 });

    // 3. Search Til-Gud
    await searchInput.fill('Til');
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Til/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Module 3: Daily Habit Logging & Micronutrient Calculations', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to Health & Lab Tracker
    await page.locator('#sidebar-nav-tracker').click();
    await page.waitForTimeout(500);

    // Hydration quick-increment (+250 ml)
    const addWaterBtn = page.locator('button:has-text("+250"), button:has-text("250ml")').first();
    if (await addWaterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addWaterBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=/ml/i').first()).toBeVisible();
    }

    // Verify nutrient progress indicators have no numeric NaN values
    const nanLocator = page.locator('text=/\\bNaN\\b/');
    const nanCount = await nanLocator.count();
    expect(nanCount).toBe(0);
  });

  test('Module 4: Fallback Engine Execution when API calls fail', async ({ request }) => {
    // 1. Test POST /api/chat with valid payload returns grounded structured response
    const chatRes = await request.post('http://localhost:3000/api/chat', {
      data: {
        message: 'What should I eat to improve my hemoglobin and iron stores?',
        profile: {
          age: 24,
          lifeStage: 'Adult Non-Pregnant',
          hemoglobin: 9.8,
          diet: 'Vegetarian'
        }
      }
    });

    expect(chatRes.ok()).toBeTruthy();
    const chatData = await chatRes.json();
    expect(chatData.reply || chatData.text).toBeDefined();

    // 2. Test POST /api/parse-lab-report without image returns graceful input validation
    const ocrRes = await request.post('http://localhost:3000/api/parse-lab-report', {
      data: { imageBase64: '' }
    });

    expect(ocrRes.status()).toBeLessThan(500);
    const ocrData = await ocrRes.json();
    expect(ocrData.error || ocrData.success === false).toBeTruthy();
  });

  test('Module 5: Clinical Biomarkers & Health Vector View', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to Health Vector & Lab Biomarkers
    await page.locator('#sidebar-nav-vector').click();
    await page.waitForTimeout(500);

    // Verify key biomarker sections
    await expect(page.locator('#demographics-input-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#dual-engine-bmi-display')).toBeVisible();
    await expect(page.locator('#lab-data-panel')).toBeVisible();

    // Verify CBC & Iron biomarkers panel
    await expect(page.locator('text=/Hemoglobin|Serum Ferritin|TIBC/i').first()).toBeVisible();

    // Toggle interactive lab edit mode
    const toggleEditBtn = page.locator('#btn-toggle-edit-labs');
    if (await toggleEditBtn.isVisible()) {
      await toggleEditBtn.click();
      await page.waitForTimeout(300);
      const hbInput = page.locator('#input-lab-hemoglobin');
      await expect(hbInput).toBeVisible();
      // Close edit mode
      await toggleEditBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify reference guide component
    await expect(page.locator('#blood-tests-reference-guide')).toBeVisible();
  });

  test('Module 6: Multi-Deficiency Probabilistic Risk Scoring', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to Deficiency Risks
    await page.locator('#sidebar-nav-risks').click();
    await page.waitForTimeout(500);

    // Verify header and deep dive section
    await expect(page.locator('#selected-risk-deep-dive')).toBeVisible({ timeout: 10000 });

    const mainArea = page.locator('main');

    // Verify all 4 primary deficiency vector cards exist in main content
    await expect(mainArea.locator('h3:has-text("Iron Deficiency")').first()).toBeVisible();
    await expect(mainArea.locator('h3:has-text("Vitamin B12")').first()).toBeVisible();
    await expect(mainArea.locator('h3:has-text("Folate")').first()).toBeVisible();
    await expect(mainArea.locator('h3:has-text("Vitamin D")').first()).toBeVisible();

    // Click Vitamin B12 card and check that the deep-dive card updates
    await mainArea.locator('h3:has-text("Vitamin B12")').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('#selected-risk-deep-dive')).toContainText(/B12|Cobalamin/i);

    // Click Vitamin D card and verify update
    await mainArea.locator('h3:has-text("Vitamin D")').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('#selected-risk-deep-dive')).toContainText(/Vitamin D|Bone|Sun/i);
  });

  test('Module 7: AYUSH Evidence-Based Wellness & Sourcing Spotlight', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to AYUSH Wellness
    await page.locator('#sidebar-nav-ayush').click();
    await page.waitForTimeout(500);

    // Verify verified remedies tab
    const verifiedTab = page.locator('#tab-ayush-verified');
    await expect(verifiedTab).toBeVisible({ timeout: 10000 });

    // Verify classical remedies appear in main
    await expect(page.locator('main').locator('text=/Punarnavadi Mandoor|Dhatri Lauha|Moringa/i').first()).toBeVisible();

    // Switch to 'Other Formulations' tab which contains Shilparamam Sourcing Spotlight
    const othersTab = page.locator('#tab-others');
    await expect(othersTab).toBeVisible();
    await othersTab.click();
    await page.waitForTimeout(400);

    // Verify Shilparamam Sourcing Spotlight section is visible on Others tab
    await expect(page.locator('#shilparamam-sourcing-spotlight')).toBeVisible({ timeout: 5000 });
  });

  test('Module 8: Medical Knowledge Guidelines & Source Filtering', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to Medical Guidelines
    await page.locator('#sidebar-nav-sources').click();
    await page.waitForTimeout(500);

    // Verify Verified RAG Grounding headline
    await expect(page.locator('text=/Medical Knowledge & Evidence Repository/i')).toBeVisible({ timeout: 10000 });

    // Test search filtering
    const searchInput = page.locator('input[placeholder*="Search guidelines"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('WHO');
    await page.waitForTimeout(400);
    await expect(page.locator('main').locator('h3:has-text("WHO"), h3:has-text("World Health")').first()).toBeVisible();

    // Clear search and click a category filter pill
    await searchInput.fill('');
    const topicPill = page.locator('button:has-text("Pediatric WHO LMS"), button:has-text("Anemia & Iron Studies")').first();
    if (await topicPill.isVisible()) {
      await topicPill.click();
      await page.waitForTimeout(400);
    }
  });

  test('Module 9: Ask Maguva AI Companion Interactive Querying', async ({ page }) => {
    await ensureAuthenticated(page);

    // Navigate to Ask Maguva AI
    await page.locator('#sidebar-nav-aiAgent').click();
    await page.waitForTimeout(500);

    // Verify container
    await expect(page.locator('#chat-interface-container')).toBeVisible({ timeout: 10000 });

    // Click one of the suggested quick prompts
    const promptBtn = page.locator('button:has-text("Why is my Ferritin low"), button:has-text("high-iron South Indian")').first();
    if (await promptBtn.isVisible()) {
      await promptBtn.click();

      // Wait for AI response bubble to appear
      const aiResponse = page.locator('div:has-text("Maguva AI Clinical Companion"), div:has-text("Citations & Clinical Reference")').first();
      await expect(aiResponse).toBeVisible({ timeout: 15000 });
    }
  });

  test('Module 10: Clinical Patient Scenario Switching & Emergency Red Flag Triage', async ({ page }) => {
    await ensureAuthenticated(page);

    // Switch scenario to Severe Anemia & Emergency Alert via sidebar selector
    const scenarioSelect = page.locator('#sidebar-scenario-select');
    await expect(scenarioSelect).toBeVisible({ timeout: 10000 });

    await scenarioSelect.selectOption('emergency-alert-demo');
    await page.waitForTimeout(600);

    // Verify that the Emergency Medical Triage Directive banner appears immediately
    const emergencyBanner = page.locator('#emergency-triage-banner');
    await expect(emergencyBanner).toBeVisible({ timeout: 8000 });
    await expect(emergencyBanner).toContainText(/Emergency Medical Triage Directive|Severe Anemia Threshold/i);

    // Switch scenario back to Bhavana IDA
    await scenarioSelect.selectOption('bhavana-ida');
    await page.waitForTimeout(600);

    // Verify that the emergency banner has cleared
    await expect(page.locator('#emergency-triage-banner')).toBeHidden({ timeout: 5000 });
  });

});
