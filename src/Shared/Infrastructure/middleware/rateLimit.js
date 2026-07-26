// presentation/middlewares/rateLimit.js
import rateLimit from 'express-rate-limit';

/**
 * Standard API Rate Limiter
 * Protects general API endpoints against brute force and DDoS attacks.
 */
export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
  },
});

/**
 * Strict Rate Limiter for Sensitive Endpoints (e.g., Auth, Payments, Refunds)
 * Protects high-value transaction or authentication endpoints from automated abuse.
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive requests from this IP, please try again later.',
    },
  },
});