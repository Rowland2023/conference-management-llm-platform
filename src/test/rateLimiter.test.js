import request from 'supertest';
import express from 'express';
import { standardRateLimiter } from '../shared/infrastructure/middleware/rateLimit.js';

describe('Rate Limiter Middleware Regression Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    // Use the pre-configured standardRateLimiter middleware directly
    app.use('/test-limit', standardRateLimiter, (req, res) => res.status(200).json({ success: true }));
  });

  it('should allow requests under the threshold and block subsequent requests', async () => {
    // Request 1: Allowed
    await request(app).get('/test-limit').expect(200);
    
    // Request 2: Allowed
    await request(app).get('/test-limit').expect(200);

    // Request 3: Bypasses threshold -> Should be blocked (429)
    const response = await request(app).get('/test-limit').expect(429);
    
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});