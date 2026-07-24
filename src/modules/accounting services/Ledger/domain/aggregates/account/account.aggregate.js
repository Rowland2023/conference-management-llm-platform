// O(1) pending balance + correct state machine
class AccountAggregate {
  constructor({ id, name, currency, type = 'ASSET', status = 'ACTIVE', postedBalance = 0n, holds = [], createdAt }) {
    if (!id) throw new InvalidArgumentError('Account: id required');
    
    this._id = id;
    this._name = name || '';
    this._currency = currency?.toUpperCase();
    this._type = type.toUpperCase();
    this._status = status.toUpperCase();
    this._postedBalance = AccountAggregate.parseMinorUnitsStrict(postedBalance);
    this._holdsMap = new Map();
    this._pendingBalance = 0n;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();

    for (const h of holds) {
      const holdEntity = h instanceof Hold ? h : new Hold(h);
      this._holdsMap.set(holdEntity.idempotencyKey, holdEntity);
      if (holdEntity.isActive()) {
        this._pendingBalance += holdEntity.amount;
      }
    }
  }

  createHold({ id, idempotencyKey, amount, description, expiresAt }) {
    if (this._status !== 'ACTIVE') throw new AccountInactiveError(`Account ${this._id} is ${this._status}`);
    
    if (this._holdsMap.has(idempotencyKey)) {
      return { hold: this._holdsMap.get(idempotencyKey), isDuplicate: true };
    }
    
    const amt = AccountAggregate.parseMinorUnitsStrict(amount);
    if (this._postedBalance - this._pendingBalance < amt) {
      throw new InsufficientFundsError(`Insufficient funds. Available: ${this._postedBalance - this._pendingBalance}, Requested: ${amt}`);
    }
    
    const hold = new Hold({ 
      id, 
      idempotencyKey, 
      accountId: this._id, 
      amount: amt, 
      currency: this._currency, 
      description, 
      expiresAt 
    });
    
    this._holdsMap.set(idempotencyKey, hold);
    this._pendingBalance += amt;
    
    return { hold, isDuplicate: false };
  }

  releaseHold(idempotencyKey) {
    // Allow release even if FROZEN, block only if CLOSED
    if (this._status === 'CLOSED') throw new AccountInactiveError(`Account ${this._id} is CLOSED`);

    const hold = this._holdsMap.get(idempotencyKey);
    if (!hold) throw new InvalidArgumentError(`Hold ${idempotencyKey} not found`);

    if (hold.isActive()) {
      this._pendingBalance -= hold.amount;
    }
    hold.release();
  }

  getPendingBalance() {
    return this._pendingBalance; // O(1) not O(n)
  }

  getAvailableBalance() {
    return this._postedBalance - this._pendingBalance;
  }

  static parseMinorUnitsStrict(value) {
    if (typeof value === 'bigint') return value;
    if (value == null) return 0n;
    const s = String(value).trim();
    if (s.includes('.')) throw new InvalidArgumentError('Amount must be integer minor units');
    return BigInt(s);
  }
}