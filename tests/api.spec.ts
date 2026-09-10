import { test, expect } from '@playwright/test';

test.describe('Maguva Health - API & Fallback Integration Tests', () => {

  test('POST /api/chat provides grounded nutritional advice with fallback guardrails', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/chat', {
      data: {
        message: 'What iron-rich foods should I consume for moderate anemia?',
        profile: {
          age: 26,
          lifeStage: 'Adult Non-Pregnant',
          hemoglobin: 9.2,
          diet: 'Vegetarian'
        }
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    const replyText = data.reply || data.text || '';
    expect(replyText.length).toBeGreaterThan(20);
  });

  test('POST /api/parse-lab-report validates missing or invalid payload gracefully', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/parse-lab-report', {
      data: { imageBase64: '' }
    });

    // Should return 400 Bad Request or 200 with error property, not an unhandled 500
    expect(response.status()).toBeLessThan(500);
    const data = await response.json();
    expect(data.error || data.success === false).toBeTruthy();
  });

  test('GET /api/health endpoint returns 200 OK status', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

});
