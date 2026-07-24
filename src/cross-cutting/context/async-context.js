/**
 * @file src/cross-cutting/async-context.js
 * @description Low-level execution context storage powered by AsyncLocalStorage.
 */
const { AsyncLocalStorage } = require('node:async_hooks');

class AsyncContext {
  constructor() {
    this.storage = new AsyncLocalStorage();
  }

  /**
   * Executes an asynchronous function within a scoped store context.
   * Accepts either a Map or a plain key-value Object.
   *
   * @param {Map<string, any>|Record<string, any>} store 
   * @param {Function} callback 
   * @returns {any} Result of the callback execution.
   */
  run(store, callback) {
    return this.storage.run(store, callback);
  }

  /**
   * Runs a callback with extended or overridden context key-values
   * without mutating the upstream parent store (Immutable scoping).
   *
   * @param {Record<string, any>} values - Key-value pairs to add/override.
   * @param {Function} callback 
   * @returns {any}
   */
  runWith(values, callback) {
    const parentStore = this.getStore() || {};
    let newStore;

    if (parentStore instanceof Map) {
      newStore = new Map(parentStore);
      Object.entries(values).forEach(([k, v]) => newStore.set(k, v));
    } else {
      newStore = { ...parentStore, ...values };
    }

    return this.storage.run(newStore, callback);
  }

  /**
   * Returns the active store instance.
   * @returns {Map<string, any>|Record<string, any>|undefined}
   */
  getStore() {
    return this.storage.getStore();
  }

  /**
   * Retrieves a specific key from the active context store.
   * @param {string} key 
   * @returns {any}
   */
  get(key) {
    const store = this.getStore();
    if (!store) return undefined;

    if (store instanceof Map) {
      return store.get(key);
    }

    return store[key];
  }

  /**
   * Sets a key-value pair on the active store.
   * Note: Mutates the store for the remaining life of this context stack.
   *
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    const store = this.getStore();
    if (!store) return;

    if (store instanceof Map) {
      store.set(key, value);
    } else {
      store[key] = value;
    }
  }
}

// Export as a singleton
module.exports = new AsyncContext();