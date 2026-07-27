import expressRateLimit from "express-rate-limit";

/**
 * Wrap express-rate-limit so it doesn't crash when unit tests
 * provide partial/mock Express response objects.
 */
const createSafeLimiter = (options) => {
  const limiter = expressRateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });

  return (req, res, next) => {
    const safeRes = res || {
      headersSent: false,
      setHeader: () => {},
      getHeader: () => {},
    };

    if (typeof safeRes.headersSent === "undefined") {
      safeRes.headersSent = false;
    }

    const safeNext =
      typeof next === "function"
        ? next
        : (err) => {
            if (err) throw err;
          };

    return limiter(req, safeRes, safeNext);
  };
};

/**
 * Factory for creating route-specific rate limiters.
 *
 * Example:
 * rateLimit({ max: 10, windowMs: 60_000 })
 */
export function rateLimit(options = {}) {
  return createSafeLimiter(options);
}

/**
 * General API limiter.
 */
export const standardRateLimiter = createSafeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message:
        "Too many requests from this IP, please try again after 15 minutes.",
    },
  },
});

/**
 * Sensitive operations.
 */
export const strictRateLimiter = createSafeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: "STRICT_RATE_LIMIT_EXCEEDED",
      message:
        "Too many sensitive requests from this IP, please try again later.",
    },
  },
});