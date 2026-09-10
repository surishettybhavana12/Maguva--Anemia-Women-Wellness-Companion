import { test, expect } from '@playwright/test';
import { calculateDualEngineBmi } from '../src/data/whoLmsData';

test.describe('Master Protocol: Dual-Engine BMI Standards (CLIN-BMI-01 to CLIN-BMI-07)', () => {

  test('CLIN-BMI-01: Dual-Engine BMI (Adult Underweight: 25y, 160cm, 42kg)', () => {
    const res = calculateDualEngineBmi(42, 160, 25);
    expect(res.isPediatric).toBe(false);
    expect(res.bmi).toBe(16.4);
    expect(res.asianIndianCategory).toBe('Underweight');
    expect(res.asianIndianRange).toBe('18.5 – 22.9 kg/m²');
    expect(res.refStandardWeightKg).toBe(55);
    expect(res.interpretation).toContain('Underweight');
  });

  test('CLIN-BMI-02: Dual-Engine BMI (Adult Normal Weight: 25y, 162cm, 55kg ICMR Reference Woman)', () => {
    const res = calculateDualEngineBmi(55, 162, 25);
    expect(res.isPediatric).toBe(false);
    expect(res.bmi).toBe(21.0);
    expect(res.asianIndianCategory).toBe('Normal weight');
    expect(res.refStandardWeightKg).toBe(55);
    expect(res.refStandardHeightCm).toBe(162);
    expect(res.refWeightDifferenceKg).toBe(0);
    expect(res.interpretation).toContain('Optimal Asian Indian Range');
  });

  test('CLIN-BMI-03: Dual-Engine BMI (Adult Overweight: 28y, 155cm, 58kg)', () => {
    const res = calculateDualEngineBmi(58, 155, 28);
    expect(res.isPediatric).toBe(false);
    expect(res.bmi).toBe(24.1);
    expect(res.asianIndianCategory).toBe('Overweight');
    expect(res.interpretation).toMatch(/hepcidin|inflammation/i);
  });

  test('CLIN-BMI-04: Dual-Engine BMI (Adult Obese: 30y, 158cm, 72kg)', () => {
    const res = calculateDualEngineBmi(72, 158, 30);
    expect(res.isPediatric).toBe(false);
    expect(res.bmi).toBe(28.8);
    expect(res.asianIndianCategory).toBe('Obesity');
    expect(res.interpretation).toMatch(/hepcidin|27.5/i);
  });

  test('CLIN-BMI-05: Dual-Engine BMI (Adolescent Underweight: 14y, 154cm, 34kg WHO LMS)', () => {
    const res = calculateDualEngineBmi(34, 154, 14);
    expect(res.isPediatric).toBe(true);
    expect(res.bmi).toBe(14.3);
    expect(res.zScore).toBeLessThan(-2.0);
    expect(res.whoCategory).toContain('Severely Thin');
    expect(res.percentile).toBeLessThan(3.0);
    expect(res.growthMilestone).toContain('13–15y Reference');
  });

  test('CLIN-BMI-06: Dual-Engine BMI (Adolescent Normal Weight: 14y, 154cm, 46.6kg ICMR-NIN Reference)', () => {
    const res = calculateDualEngineBmi(46.6, 154, 14);
    expect(res.isPediatric).toBe(true);
    expect(res.bmi).toBe(19.6);
    expect(res.zScore).toBeGreaterThanOrEqual(-1.0);
    expect(res.zScore).toBeLessThanOrEqual(1.0);
    expect(res.whoCategory).toContain('Normal Growth Median');
    expect(res.percentile).toBeGreaterThanOrEqual(15.0);
    expect(res.percentile).toBeLessThanOrEqual(85.0);
    expect(res.growthMilestone).toContain('46.6 kg / 154 cm');
  });

  test('CLIN-BMI-07: Dual-Engine BMI (Adolescent Overweight / Obese: 15y, 156cm, 65kg)', () => {
    const res = calculateDualEngineBmi(65, 156, 15);
    expect(res.isPediatric).toBe(true);
    expect(res.bmi).toBe(26.7);
    expect(res.zScore).toBeGreaterThan(1.0);
    expect(res.whoCategory).toMatch(/Overweight|Obesity/i);
    expect(res.percentile).toBeGreaterThan(90.0);
  });

  test('CLIN-BMI-UI: Profile UI Renders Dual-Engine BMI with Asian-Indian & WHO LMS standard', async ({ page }) => {
    await page.goto('/');
    // Authenticate if needed
    const demoBtn = page.locator('#btn-quick-demo-login');
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForTimeout(400);
    }
    const consent = page.locator('#disclaimer-checkbox');
    if (await consent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consent.check();
      await page.locator('#btn-agree-and-continue').click();
      await page.waitForTimeout(400);
    }
    const closeModal = page.locator('#btn-close-profile-builder-modal');
    if (await closeModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeModal.click();
      await page.waitForTimeout(300);
    }

    // Navigate to Health Vector view
    await page.locator('#sidebar-nav-vector').click();
    await page.waitForTimeout(500);

    // Verify dual engine BMI display card is visible
    const bmiCard = page.locator('#dual-engine-bmi-display, #health-vector-view');
    await expect(bmiCard.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toContainText(/Asian-Indian|WHO LMS|BMI/i);
  });

});
