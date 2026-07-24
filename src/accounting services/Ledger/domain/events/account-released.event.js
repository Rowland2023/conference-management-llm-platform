/**
 * @file src/domain/events/account-released.event.js
 */
const BaseDomainEvent = require('./base-domain.event');
const { InvalidArgumentError } = require('../errors');

class AccountReleasedEvent extends BaseDomainEvent {
  static EVENT_NAME = 'account.released';

  /**
   * @param {Object} props
   * @param {string} [props.eventId]
   * @param {string} props.accountId
   * @param {string} props.holdId
   * @param {bigint|string|number} props.releasedAmount Minor units integer
   * @param {string} [props.reason='Hold released']
   * @param {Object} [props.metadata] Correlation & tracing headers
   * @param {Date|string} [props.occurredAt]
   */
  constructor({
    eventId,
    accountId,
    holdId,
    releasedAmount,
    reason = 'Hold released',
    metadata = {},
    occurredAt,
  }) {
    // 1. Explicit Domain Validations
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new InvalidArgumentError('AccountReleasedEvent: accountId is required');
    }
    if (!holdId || typeof holdId !== 'string' || holdId.trim() === '') {
      throw new InvalidArgumentError('AccountReleasedEvent: holdId is required');
    }

    // 2. Strict Minor Units Parsing (No Silent Float Truncation)
    const bigintReleasedAmount = AccountReleasedEvent.parseMinorUnitsStrict(releasedAmount);
    if (bigintReleasedAmount <= 0n) {
      throw new InvalidArgumentError('AccountReleasedEvent: releasedAmount must be strictly greater than zero');
    }

    const cleanReason = String(reason).trim() || 'Hold released';

    // 3. Delegate payload and metadata construction to BaseDomainEvent
    super({
      eventId,
      eventName: AccountReleasedEvent.EVENT_NAME,
      aggregateId: accountId,
      version: 1,
      occurredAt,
      metadata,
      payload: {
        accountId,
        holdId,
        releasedAmount: bigintReleasedAmount.toString(),
        reason: cleanReason,
      },
    });

    Object.freeze(this);
  }

  /**
   * Rejects decimal strings explicitly to prevent financial audit corruption.
   * @private
   */
  static parseMinorUnitsStrict(value) {
    if (typeof value === 'bigint') return value;
    if (value === null || value === undefined) {
      throw new InvalidArgumentError('AccountReleasedEvent: releasedAmount is required');
    }

    const strValue = String(value).trim();
    if (strValue.includes('.')) {
      throw new InvalidArgumentError(
        `AccountReleasedEvent: releasedAmount must be an integer string representing minor units (e.g., 10025 for $100.25). Received decimal: '${strValue}'`
      );
    }

    try {
      return BigInt(strValue);
    } catch {
      throw new InvalidArgumentError(`AccountReleasedEvent: unable to parse releasedAmount '${strValue}' as a valid BigInt`);
    }
  }
}

module.exports = AccountReleasedEvent;