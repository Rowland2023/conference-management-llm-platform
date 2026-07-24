/**
 * @file src/cross-cutting/request-context.js
 * @description High-level domain context manager for tracking request/job metadata.
 */
const { randomUUID } = require('node:crypto');
const asyncContext = require('./async-context');

class RequestContext {
  /**
   * Express Middleware to initialize context for incoming HTTP requests.
   */
  static middleware() {
    return (req, res, next) => {
      const correlationId =
        req.headers['x-correlation-id'] ||
        req.headers['x-request-id'] ||
        req.headers['traceparent'] ||
        randomUUID();

      // Reflect correlation ID in response headers for client tracing
      res.setHeader('X-Correlation-ID', correlationId);

      const store = {
        correlationId,
        path: req.originalUrl || req.url,
        method: req.method,
      };

      // Extract tenant context if passed down from reverse proxy/gateway
      if (req.headers['x-tenant-id']) {
        store.tenantId = req.headers['x-tenant-id'];
      }

      asyncContext.run(store, () => next());
    };
  }

  /**
   * Runs an asynchronous execution block with a manually created context.
   * Ideal for outbox background workers, Kafka consumers, or scheduled jobs.
   *
   * @param {Object} contextData - Initial metadata to seed (e.g. { correlationId, tenantId, userId })
   * @param {Function} fn - Async operation to execute
   * @returns {any} Result of fn execution
   */
  static run(contextData = {}, fn) {
    const store = {
      correlationId: contextData.correlationId || randomUUID(),
      ...(contextData.tenantId && { tenantId: contextData.tenantId }),
      ...(contextData.userId && { userId: contextData.userId }),
      ...(contextData.source && { source: contextData.source }),
    };

    return asyncContext.run(store, fn);
  }

  /**
   * Get current correlation ID.
   * @returns {string|null}
   */
  static getCorrelationId() {
    return asyncContext.get('correlationId') || null;
  }

  /**
   * Get current tenant ID.
   * @returns {string|null}
   */
  static getTenantId() {
    return asyncContext.get('tenantId') || null;
  }

  /**
   * Get all active context key-values as a plain JavaScript object.
   * Zero-cost shallow clone.
   * @returns {Record<string, any>}
   */
  static getAll() {
    const store = asyncContext.getStore();
    if (!store) return {};
    return { ...store };
  }

  /**
   * Mutates or adds a key to the active request context dynamically
   * (e.g., attaching authenticated userId after JWT verification).
   *
   * @param {string} key 
   * @param {any} value 
   */
  static set(key, value) {
    asyncContext.set(key, value);
  }
}

module.exports = RequestContext;