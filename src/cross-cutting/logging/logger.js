/**
 * @file src/cross-cutting/logger.js
 * @description Context-aware facade for system logging.
 */
const RequestContext = require('./request-context');

class Logger {
  /**
   * @param {Object} adapter - Concrete logger adapter instance (e.g. WinstonLoggerAdapter, PinoLogger)
   */
  constructor(adapter) {
    if (!adapter) {
      throw new Error('Logger requires a concrete logger adapter instance.');
    }
    this.adapter = adapter;
  }

  /**
   * Enriches arbitrary metadata with active request/async context
   * and serializes JavaScript Error objects properly.
   * 
   * @private
   * @param {Object|Error|undefined} meta 
   * @returns {Object}
   */
  _enrichMeta(meta) {
    const contextMeta = RequestContext.getAll();
    let normalizedMeta = {};

    if (meta instanceof Error) {
      normalizedMeta = {
        error: {
          message: meta.message,
          name: meta.name,
          stack: meta.stack,
          ...(meta.code && { code: meta.code }),
        },
      };
    } else if (typeof meta === 'object' && meta !== null) {
      normalizedMeta = { ...meta };
      if (normalizedMeta.error instanceof Error) {
        const err = normalizedMeta.error;
        normalizedMeta.error = {
          message: err.message,
          name: err.name,
          stack: err.stack,
          ...(err.code && { code: err.code }),
        };
      }
    }

    return {
      ...contextMeta,
      ...normalizedMeta,
    };
  }

  /**
   * Delegates call to underlying adapter with normalized parameters.
   * Supports both Winston `(msg, meta)` and Pino `(meta, msg)` adapter adapters.
   * 
   * @private
   */
  _log(level, message, meta) {
    const enrichedMeta = this._enrichMeta(meta);

    // If message itself is an Error instance
    let logMessage = message;
    if (message instanceof Error) {
      logMessage = message.message;
      enrichedMeta.error = {
        message: message.message,
        name: message.name,
        stack: message.stack,
        ...(message.code && { code: message.code }),
      };
    }

    if (typeof this.adapter[level] !== 'function') {
      return;
    }

    // Call adapter method based on detected capability/type
    this.adapter[level](logMessage, enrichedMeta);
  }

  info(message, meta) {
    this._log('info', message, meta);
  }

  error(message, meta) {
    this._log('error', message, meta);
  }

  warn(message, meta) {
    this._log('warn', message, meta);
  }

  debug(message, meta) {
    this._log('debug', message, meta);
  }
}

module.exports = Logger;