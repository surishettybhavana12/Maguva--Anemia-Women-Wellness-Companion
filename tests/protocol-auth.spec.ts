import { test, expect } from '@playwright/test';

test.describe('Master Protocol: Authentication & Access Control (SEC-AUTH-01 to SEC-AUTH-12)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SEC-AUTH-02: Registration Validation Blocks Short Passwords & Malformed Emails', async ({ page }) => {
    // If signed in, sign out first
    const signoutBtn = page.locator('#sidebar-signout-btn');
    if (await signoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await signoutBtn.click();
    }

    // Toggle to register form
    const registerLink = page.locator('#link-register-new-user');
    await expect(registerLink).toBeVisible({ timeout: 5000 });
    await registerLink.click();

    // 1. Submit with short password
    await page.locator('#signup-name').fill('Bhavana S');
    await page.locator('#signup-email').fill('test.user@domain.com');
    await page.locator('#signup-password').fill('123');
    await page.locator('#signup-confirm-password').fill('123');
    await page.locator('#btn-signup-submit').click();

    // Verify error notification
    const errorBanner = page.locator('#auth-error-banner');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(errorBanner).toContainText(/Password must be at least 6 characters/i);

    // 2. Submit with malformed email (missing @ and .com)
    await page.locator('#signup-password').fill('ValidPass123!');
    await page.locator('#signup-confirm-password').fill('ValidPass123!');
    await page.locator('#signup-email').fill('invalid-email-string');
    await page.locator('#btn-signup-submit').click();
    await expect(errorBanner).toContainText(/Email must include/i);
  });

  test('SEC-AUTH-01: Registration with Valid Credentials & State Initialization', async ({ page }) => {
    const registerLink = page.locator('#link-register-new-user');
    if (await registerLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await registerLink.click();
    }

    const uniqueEmail = `bhavana.test.${Date.now()}@domain.com`;
    await page.locator('#signup-name').fill('Bhavana S');
    await page.locator('#signup-email').fill(uniqueEmail);
    await page.locator('#signup-password').fill('StrongPass123!');
    await page.locator('#signup-confirm-password').fill('StrongPass123!');
    await page.locator('#btn-signup-submit').click();

    // Should proceed to Consent / Disclaimer or Dashboard
    const consentOrDashboard = page.locator('#disclaimer-view-page, #dashboard-view, #btn-agree-and-continue');
    await expect(consentOrDashboard.first()).toBeVisible({ timeout: 10000 });
  });

  test('SEC-AUTH-03: Sign In with Invalid Password Shows Rejection, Valid Login Routes Cleanly', async ({ page }) => {
    // Navigate to sign in view if in signup or logged in
    const backToSignin = page.locator('#link-back-to-signin');
    if (await backToSignin.isVisible({ timeout: 1500 }).catch(() => false)) {
      await backToSignin.click();
    }
    const signoutBtn = page.locator('#sidebar-signout-btn');
    if (await signoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await signoutBtn.click();
    }

    // Invalid password attempt
    await page.locator('#signin-email').fill('demo.patient@maguva.health.com');
    await page.locator('#signin-password').fill('WrongPassword999!');
    await page.locator('#btn-signin-submit').click();

    // Rejection message
    const errorBanner = page.locator('#auth-error-banner');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(errorBanner).toContainText(/Invalid email or password|Incorrect password|Failed/i);

    // Quick demo login routes directly
    await page.locator('#btn-quick-demo-login').click();
    const consentOrDash = page.locator('#disclaimer-view-page, #dashboard-view, #btn-agree-and-continue');
    await expect(consentOrDash.first()).toBeVisible({ timeout: 10000 });
  });

  test('SEC-AUTH-04 & 05 & 06: Forgot Password Nonexistent Account, Registered Email, & 3s Countdown', async ({ page }) => {
    // Sign out if signed in
    const signoutBtn = page.locator('#sidebar-signout-btn');
    if (await signoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await signoutBtn.click();
    }

    // Click Forgot password? link
    const forgotLink = page.locator('#btn-forgot-password-link');
    await expect(forgotLink).toBeVisible({ timeout: 5000 });
    await forgotLink.click();

    // SEC-AUTH-04: Nonexistent email
    await page.locator('#forgot-email').fill('nonexistent987@xyz.com');
    await page.locator('#btn-forgot-submit').click();
    const errorNotice = page.locator('#auth-error-banner');
    await expect(errorNotice).toBeVisible({ timeout: 5000 });
    await expect(errorNotice).toContainText(/No account found with this email/i);

    // SEC-AUTH-05 & 06: Registered email
    await page.locator('#forgot-email').fill('surishettybhavana12@gmail.com');
    await page.locator('#btn-forgot-submit').click();

    // Success banner with countdown
    const successBanner = page.locator('#auth-success-banner');
    await expect(successBanner).toBeVisible({ timeout: 6000 });
    await expect(successBanner).toContainText(/Password reset link has been sent to your email address/i);
    await expect(successBanner).toContainText(/Redirecting/i);
  });

  test('SEC-AUTH-09 & 10: Standard Sign-Out & Route Protection Invalidation', async ({ page }) => {
    // Ensure user is signed in
    const demoBtn = page.locator('#btn-quick-demo-login');
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoBtn.click();
    }
    const consent = page.locator('#disclaimer-checkbox');
    if (await consent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consent.check();
      await page.locator('#btn-agree-and-continue').click();
    }

    // Perform standard sign out
    const signout = page.locator('#sidebar-signout-btn');
    await expect(signout).toBeVisible({ timeout: 5000 });
    await signout.click();

    // Verify session terminates and routes to sign-in screen
    const signinCard = page.locator('#signin-email');
    await expect(signinCard).toBeVisible({ timeout: 8000 });

    // SEC-AUTH-10: Test route guard - protected elements should not be visible
    const mealPlanner = page.locator('#meal-logging-studio');
    await expect(mealPlanner).not.toBeVisible();
    const healthVector = page.locator('#health-vector-view');
    await expect(healthVector).not.toBeVisible();
  });

});
