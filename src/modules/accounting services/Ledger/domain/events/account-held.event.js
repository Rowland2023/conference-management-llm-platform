const BaseDomainEvent = require('./base-domain.event');
const Money = require('../value-objects/money.vo');
const { InvalidArgumentError } = require('../errors');

class AccountHeldEvent extends BaseDomainEvent {
  static EVENT_NAME = 'account.held';

  constructor({ eventId, accountId, holdId, idempotencyKey, amount, currency, expiresAt, metadata, occurredAt }) {
    if (!accountId?.trim()) throw new InvalidArgumentError('accountId required');
    if (!holdId?.trim()) throw new InvalidArgumentError('holdId required');
    if (!idempotencyKey?.trim()) throw new InvalidArgumentError('idempotencyKey required');

    const normalizedCurrency = currency?.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) throw new InvalidArgumentError(`Invalid currency ${currency}`);

    const bigintAmount = Money.parseMinorUnitsStrict(amount);
    Money.assertPositive(bigintAmount);

    super({
      eventId,
      eventName: AccountHeldEvent.EVENT_NAME,
      aggregateId: accountId,
      payload: {
        accountId, holdId, idempotencyKey,
        amount: bigintAmount.toString(),
        currency: normalizedCurrency,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
      metadata,
      occurredAt,
      version: 1,
    });
  }
}

module.exports = AccountHeldEvent;