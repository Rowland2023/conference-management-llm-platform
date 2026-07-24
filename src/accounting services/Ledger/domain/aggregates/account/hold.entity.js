// Running totals + pure getters + explicit expire
class Hold {
  constructor(props) {
    // ... your validations ...
    this._status = normalizedStatus;
  }

  canReserve() { return this._status === 'ACTIVE' && !this.isExpired(); }
  isExpired(now = new Date()) { return !!this._expiresAt && this._expiresAt.getTime() <= now.getTime(); }

  release(now) {
    this.assertActive(now);
    this._status = 'RELEASED';
  }

  capture(now) {
    this.assertActive(now);
    this._status = 'CAPTURED';
  }

  assertActive(now = new Date()) {
    if (this._status !== 'ACTIVE') throw new InvalidStateError(`Hold is ${this._status}`);
    if (this.isExpired(now)) {
      throw new InvalidStateError('Hold expired');
    }
  }
}