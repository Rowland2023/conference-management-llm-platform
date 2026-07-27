// src/cross-cutting/context/async-context.js

import { AsyncLocalStorage } from "node:async_hooks";

class AsyncContext {
  constructor() {
    this.storage = new AsyncLocalStorage();
  }

  /**
   * Executes a callback within a context.
   */
  run(store, callback) {
    return this.storage.run(store, callback);
  }

  /**
   * Runs with additional values merged into the current context.
   */
  runWith(values, callback) {
    const parentStore = this.getStore() || {};
    let newStore;

    if (parentStore instanceof Map) {
      newStore = new Map(parentStore);

      for (const [k, v] of Object.entries(values)) {
        newStore.set(k, v);
      }
    } else {
      newStore = {
        ...parentStore,
        ...values,
      };
    }

    return this.storage.run(newStore, callback);
  }

  /**
   * Returns the active store.
   */
  getStore() {
    return this.storage.getStore();
  }

  /**
   * Gets a value from the current context.
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
   * Sets a value on the current context.
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

const asyncContext = new AsyncContext();

export default asyncContext;