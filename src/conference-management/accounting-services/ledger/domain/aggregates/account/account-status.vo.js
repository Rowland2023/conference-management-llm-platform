/**
 * @file ledger/domain/aggregates/account/account-status.vo.js
 */

import {
  InvalidArgumentError,
  AccountInactiveError,
} from "../../error/index.js";

export class AccountStatus {
  static ACTIVE = "ACTIVE";
  static FROZEN = "FROZEN";
  static SUSPENDED = "SUSPENDED";
  static CLOSED = "CLOSED";

  static VALID_STATUSES = Object.freeze([
    AccountStatus.ACTIVE,
    AccountStatus.FROZEN,
    AccountStatus.SUSPENDED,
    AccountStatus.CLOSED,
  ]);

  static ALLOWED_TRANSITIONS = Object.freeze({
    [AccountStatus.ACTIVE]: [
      AccountStatus.FROZEN,
      AccountStatus.SUSPENDED,
      AccountStatus.CLOSED,
    ],

    [AccountStatus.FROZEN]: [
      AccountStatus.ACTIVE,
      AccountStatus.CLOSED,
    ],

    [AccountStatus.SUSPENDED]: [
      AccountStatus.ACTIVE,
      AccountStatus.CLOSED,
    ],

    [AccountStatus.CLOSED]: [],
  });

  constructor(value) {
    const rawValue =
      value instanceof AccountStatus
        ? value.value
        : value;

    const formatted =
      rawValue?.toString()
        .trim()
        .toUpperCase();

    if (!AccountStatus.VALID_STATUSES.includes(formatted)) {
      throw new InvalidArgumentError(
        `Invalid account status '${value}'. Valid values: ${AccountStatus.VALID_STATUSES.join(", ")}`
      );
    }

    this._value = formatted;

    Object.freeze(this);
  }

  get value() {
    return this._value;
  }

  static active() {
    return new AccountStatus(AccountStatus.ACTIVE);
  }

  static frozen() {
    return new AccountStatus(AccountStatus.FROZEN);
  }

  static suspended() {
    return new AccountStatus(AccountStatus.SUSPENDED);
  }

  static closed() {
    return new AccountStatus(AccountStatus.CLOSED);
  }

  canDebit() {
    return this._value === AccountStatus.ACTIVE;
  }

  canCredit() {
    return (
      this._value === AccountStatus.ACTIVE ||
      this._value === AccountStatus.FROZEN
    );
  }

  canPlaceHold() {
    return this._value === AccountStatus.ACTIVE;
  }

  canTransitionTo(targetStatus) {
    const target =
      targetStatus instanceof AccountStatus
        ? targetStatus.value
        : targetStatus?.toUpperCase();

    return (
      AccountStatus.ALLOWED_TRANSITIONS[this._value]
        ?.includes(target) ?? false
    );
  }

  assertCanDebit() {
    if (!this.canDebit()) {
      throw new AccountInactiveError(
        `Cannot debit account in '${this._value}' status`
      );
    }
  }

  assertCanCredit() {
    if (!this.canCredit()) {
      throw new AccountInactiveError(
        `Cannot credit account in '${this._value}' status`
      );
    }
  }

  assertCanPlaceHold() {
    if (!this.canPlaceHold()) {
      throw new AccountInactiveError(
        `Cannot place hold on account in '${this._value}' status`
      );
    }
  }

  assertCanTransitionTo(targetStatus) {
    if (!this.canTransitionTo(targetStatus)) {
      const target =
        targetStatus instanceof AccountStatus
          ? targetStatus.value
          : targetStatus;

      throw new InvalidArgumentError(
        `Illegal transition from '${this._value}' to '${target}'`
      );
    }
  }

  equals(other) {
    if (!other) {
      return false;
    }

    if (other instanceof AccountStatus) {
      return this._value === other.value;
    }

    if (typeof other === "string") {
      return (
        this._value ===
        other.trim().toUpperCase()
      );
    }

    return false;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}

export default AccountStatus;