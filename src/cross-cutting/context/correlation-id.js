/**
 * @file src/cross-cutting/correlation-id.js
 * @description Provides asynchronous context tracing via Node's AsyncLocalStorage.
 */
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');

const asyncLocalStorage = new AsyncLocalStorage();

class CorrelationContext {
  /**
   * Express/Fastify Middleware to attach or extract Correlation IDs for incoming HTTP requests.
   * Standardizes incoming headers and binds context across the entire request lifecycle.
   */
  static middleware() {
    return (req, res, next) => {
      const headerCorrelationId =
        req.headers['x-correlation-id'] ||
        req.headers['x-request-id'] ||
        req.headers['traceparent'] ||
        randomUUID();

      // Mirror ID back to client in response header
      res.setHeader('X-Correlation-ID', headerCorrelationId);

      // Lightweight object store instead of Map instantiation
      const store = { correlationId: headerCorrelationId };

      asyncLocalStorage.run(store, () => {
        next();
      });
    };
  }

  /**
   * Manually executes an asynchronous function block within a given correlation context.
   * Ideal for background workers, outbox event processors, or Kafka consumers.
   *
   * @param {string} [correlationId] - Optional correlation ID; generates UUID if omitted.
   * @param {Function} fn - Asynchronous or synchronous task function to execute.
   * @returns {any} Return value of the executed function (or Promise).
   */
  static run(correlationId, fn) {
    const id = correlationId || randomUUID();
    const store = { correlationId: id };

    return asyncLocalStorage.run(store, fn);
  }

  /**
   * Retrieves the active correlation ID from the async storage context.
   * @returns {string|null} Correlation ID string or null if outside context.
   */
  static getCorrelationId() {
    const store = asyncLocalStorage.getStore();
    return store?.correlationId || null;
  }
}

module.exports = CorrelationContext;