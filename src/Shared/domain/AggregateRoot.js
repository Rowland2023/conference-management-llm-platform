/**
 * @file src/platform/shared/domain/AggregateRoot.js
 *
 * Base class for DDD Aggregate Roots.
 *
 * Responsibilities:
 * - Maintain aggregate identity through Entity
 * - Collect domain events raised during state changes
 * - Provide controlled event dispatch lifecycle
 *
 * Aggregates should never publish events directly.
 * Application services/infrastructure should pull events
 * after a successful transaction commit.
 */

import { Entity } from "./Entity.js";

export class AggregateRoot extends Entity {

  constructor(id) {
    super(id);

    /**
     * Internal domain event queue.
     * Events remain private until pulled by the application layer.
     *
     * @type {Array<Object>}
     */
    this._domainEvents = [];
  }


  /**
   * Registers a domain event raised by this aggregate.
   *
   * @param {Object} event
   * @throws {TypeError}
   */
  addDomainEvent(event) {

    if (!event) {
      throw new TypeError(
        "Domain event cannot be null or undefined."
      );
    }

    if (typeof event !== "object") {
      throw new TypeError(
        "Domain event must be an object."
      );
    }

    this._domainEvents.push(event);
  }


  /**
   * Returns and clears pending domain events.
   *
   * Called after successful persistence.
   *
   * Example:
   *
   * const events = aggregate.pullDomainEvents();
   * await eventPublisher.publish(events);
   *
   *
   * @returns {Array<Object>}
   */
  pullDomainEvents() {

    const events = [
      ...this._domainEvents,
    ];

    this.clearDomainEvents();

    return events;
  }


  /**
   * Clears pending domain events without returning them.
   *
   * Useful when a transaction rolls back.
   */
  clearDomainEvents() {

    this._domainEvents.length = 0;
  }


  /**
   * Read-only snapshot of pending events.
   *
   * Prevents callers from mutating internal state.
   *
   * @returns {Array<Object>}
   */
  get domainEvents() {

    return [
      ...this._domainEvents,
    ];
  }


  /**
   * Indicates whether this aggregate
   * has unpublished domain events.
   *
   * @returns {boolean}
   */
  hasDomainEvents() {

    return this._domainEvents.length > 0;
  }


  /**
   * Number of pending events.
   *
   * Useful for diagnostics/testing.
   *
   * @returns {number}
   */
  get domainEventCount() {

    return this._domainEvents.length;
  }
}