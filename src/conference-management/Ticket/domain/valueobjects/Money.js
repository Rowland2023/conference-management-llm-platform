export class Money {
  constructor(amount, currency = "USD") {
    if (amount === undefined || amount === null) {
      throw new Error("Money amount is required");
    }

    if (Number.isNaN(Number(amount))) {
      throw new Error("Money amount must be numeric");
    }

    if (!currency || currency.length !== 3) {
      throw new Error("Invalid currency");
    }

    this.amount = Number(amount);
    this.currency = currency.toUpperCase();

    Object.freeze(this);
  }

  add(other) {
    this._assertSameCurrency(other);

    return new Money(
      this.amount + other.amount,
      this.currency
    );
  }

  subtract(other) {
    this._assertSameCurrency(other);

    return new Money(
      this.amount - other.amount,
      this.currency
    );
  }

  equals(other) {
    return (
      other instanceof Money &&
      this.amount === other.amount &&
      this.currency === other.currency
    );
  }

  _assertSameCurrency(other) {
    if (!(other instanceof Money)) {
      throw new Error("Expected Money instance");
    }

    if (this.currency !== other.currency) {
      throw new Error("Currency mismatch");
    }
  }
}