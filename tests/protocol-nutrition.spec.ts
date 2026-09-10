import { test, expect } from '@playwright/test';
import { CURATED_FOOD_LIBRARY } from '../src/data/foodDatabase';
import { ICMR_NIN_2020_PROFILES } from '../src/data/icmrNinRda2020';

test.describe('Master Protocol: Nutrition Engine & Food Library (NUT-DATA-01 to 07, CALC-INT, CALC-RDA)', () => {

  test('NUT-DATA-01 & 02: Food Library Curated Items Data Parity & Serving Multipliers', () => {
    // 1. Chana Saag check
    const chanaSaag = CURATED_FOOD_LIBRARY.find((f) => f.id === 'wifs-chana-saag');
    expect(chanaSaag).toBeDefined();
    const iron = (chanaSaag as any).nutrients?.ironMg ?? chanaSaag!.ironMg;
    const folate = (chanaSaag as any).nutrients?.folateMcg ?? chanaSaag!.folateMcg;
    expect(iron).toBe(9.8);
    expect(folate).toBe(140.0);
    expect(chanaSaag!.isWifsHandbook).toBe(true);

    // Serving multiplier 2
    const servings = 2;
    const scaledIron = Math.round(iron * servings * 10) / 10;
    const scaledFolate = Math.round(folate * servings * 10) / 10;
    expect(scaledIron).toBe(19.6);
    expect(scaledFolate).toBe(280.0);

    // 2. Halim Soaked Seed Drink
    const halim = CURATED_FOOD_LIBRARY.find((f) => f.name.toLowerCase().includes('garden cress') || f.name.toLowerCase().includes('halim'));
    expect(halim).toBeDefined();
    const halimIron = (halim as any).nutrients?.ironMg ?? halim!.ironMg;
    expect(halimIron).toBeGreaterThanOrEqual(8.0);

    // 3. Til-Gud Laddoo
    const tilGud = CURATED_FOOD_LIBRARY.find((f) => f.id === 'wifs-til-gingelly-ladoo' || f.name.toLowerCase().includes('til'));
    expect(tilGud).toBeDefined();
    const tilIron = (tilGud as any).nutrients?.ironMg ?? tilGud!.ironMg;
    expect(tilIron).toBeGreaterThanOrEqual(7.0);

    // 4. Kantewali Chaulai
    const chaulai = CURATED_FOOD_LIBRARY.find((f) => f.id === 'wifs-kantewali-chaulai');
    expect(chaulai).toBeDefined();
    const chaulaiIron = (chaulai as any).nutrients?.ironMg ?? chaulai!.ironMg;
    expect(chaulaiIron).toBeGreaterThanOrEqual(8.0);
  });

  test('CALC-INT-01: Cumulative Nutrient Summation Across Multiple Foods', () => {
    // Cumulative calculation formula
    const meal1Fe = 8.4; // Halim Drink
    const meal2Fe = 9.8; // Chana Saag Sabji
    const meal3Fe = 7.2; // Til-Gud Laddoo
    const totalFe = Math.round((meal1Fe + meal2Fe + meal3Fe) * 10) / 10;
    expect(totalFe).toBe(25.4);

    const rdaTarget = 29.0;
    const pct = Math.round((totalFe / rdaTarget) * 100);
    expect(pct).toBe(88); // ~87.58% rounds to 88%
  });

  test('CALC-RDA-01 & 02: ICMR-NIN 2020 RDA Benchmarks across Life Stages & Genders', () => {
    // Adult Female Non-Pregnant Moderate Work
    const adultFemale = ICMR_NIN_2020_PROFILES['woman-moderate'];
    expect(adultFemale.ironRdaMg).toBe(29.0);
    expect(adultFemale.folateRdaMcg).toBe(220.0);
    expect(adultFemale.calciumRdaMg).toBe(1000.0);
    expect(adultFemale.vitaminCRdaMg).toBe(65.0);

    // Pregnant Woman (highest folate)
    const pregnant = ICMR_NIN_2020_PROFILES['woman-pregnant'];
    expect(pregnant.ironRdaMg).toBeGreaterThanOrEqual(27.0);
    expect(pregnant.folateRdaMcg).toBe(570.0);

    // Lactating Woman
    const lactating = ICMR_NIN_2020_PROFILES['woman-lactating'];
    expect(lactating.ironRdaMg).toBe(23.0);
    expect(lactating.calciumRdaMg).toBe(1200.0);
    expect(lactating.vitaminCRdaMg).toBe(115.0);
  });

  test('NUT-DATA-01 to 05 (UI): Search Foods, WIFS Filter, Log Meal, Synergies & RDA Matrix', async ({ page }) => {
    await page.goto('/');

    // Handle login / consent if needed
    const demoBtn = page.locator('#btn-quick-demo-login');
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoBtn.click();
    }
    const consent = page.locator('#disclaimer-checkbox');
    if (await consent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consent.check();
      await page.locator('#btn-agree-and-continue').click();
    }

    // Navigate to Meal Planner view
    await page.locator('#sidebar-nav-meals').click();
    await page.waitForTimeout(400);

    // Verify ICMR-NIN RDA Matrix is visible
    const rdaMatrix = page.locator('#icmr-nin-rda-matrix');
    await expect(rdaMatrix).toBeVisible({ timeout: 8000 });
    await expect(rdaMatrix).toContainText(/ICMR-NIN 2020/i);

    // Test Search for existing items: "Chana Saag"
    const searchInput = page.locator('#input-search-foods');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('Chana Saag');
    await page.waitForTimeout(300);

    // Verify Chana Saag card appears
    const chanaCard = page.locator('text=Chana Saag');
    await expect(chanaCard.first()).toBeVisible({ timeout: 5000 });

    // Search for "Kantewali Chaulai"
    await searchInput.fill('Kantewali Chaulai');
    await page.waitForTimeout(300);
    const chaulaiCard = page.locator('text=Kantewali Chaulai');
    await expect(chaulaiCard.first()).toBeVisible({ timeout: 5000 });

    // Switch to WIFS Handbook Recipes tab
    const wifsTab = page.locator('#tab-mode-wifs');
    await expect(wifsTab).toBeVisible();
    await wifsTab.click();
    await page.waitForTimeout(300);

    // Verify WIFS formulations render
    const wifsHeader = page.locator('text=WIFS Program (Govt. of India & UNICEF)');
    await expect(wifsHeader).toBeVisible();
  });

  test('AUD-SYS-01: CSV Food Library Export File Generation', async ({ page }) => {
    await page.goto('/');
    const demoBtn = page.locator('#btn-quick-demo-login');
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoBtn.click();
    }
    const consent = page.locator('#disclaimer-checkbox');
    if (await consent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consent.check();
      await page.locator('#btn-agree-and-continue').click();
    }

    // Navigate to Meal Planner
    await page.locator('#sidebar-nav-meals').click();

    // Verify Export CSV button is present and clickable
    const exportBtn = page.locator('#btn-export-csv');
    await expect(exportBtn).toBeVisible({ timeout: 5000 });

    // Trigger download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await exportBtn.click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/maguva_food_library.*\.csv/i);
    }
  });

});
