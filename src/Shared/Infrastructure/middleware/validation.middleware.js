/**
 * @file src/presentation/middleware/validation.middleware.js
 * 
 * Express middleware wrapper for Zod schema validation.
 */
const { ZodError } = require('zod');

/**
 * Creates an Express middleware to validate req.body, req.query, and req.params against a Zod schema.
 * 
 * @param {import('zod').ZodSchema} schema 
 * @returns {Function} Express middleware function
 */
function validate(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Safely apply parsed, sanitized, and transformed properties back to req
      if (parsed.body) req.body = parsed.body;
      if (parsed.params) Object.assign(req.params, parsed.params);
      if (parsed.query) Object.assign(req.query, parsed.query);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => {
          // Strip top-level boundary target ('body', 'query', 'params') from issue path
          const [location, ...fieldPath] = issue.path;

          return {
            location: typeof location === 'string' ? location : 'body',
            field: fieldPath.join('.') || String(location),
            message: issue.message,
          };
        });

        return res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid request payload',
            details,
          },
        });
      }

      next(error);
    }
  };
}

module.exports = { validate };