// src/shared/presentation/middleware/validate.js
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    
    // Replace req with sanitized, coerced values
    req.body = parsed.body || req.body;
    req.params = parsed.params || req.params;
    req.query = parsed.query || req.query;
    
    next();
  } catch (err) {
    next(err); // Route to global Zod error formatter
  }
};