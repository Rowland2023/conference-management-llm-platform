/**
 * @file ledger/domain/aggregates/account/hold.entity.js
 */

import { randomUUID } from "node:crypto";

import {
  InvalidArgumentError,
  InvalidStateError,
} from "../../error/index.js";

export default class HoldEntity {

  static STATUS = Object.freeze({
    ACTIVE: "ACTIVE",
    RELEASED: "RELEASED",
    CAPTURED: "CAPTURED",
    EXPIRED: "EXPIRED",
  });

  constructor({
    id = randomUUID(),
    accountId,
    idempotencyKey,
    amount,
    currency,
    description = "",
    expiresAt = null,
    status = HoldEntity.STATUS.ACTIVE,
    createdAt = new Date(),
    metadata = {},
  }) {

    if (!accountId) {
      throw new InvalidArgumentError(
        "accountId is required."
      );
    }

    if (!idempotencyKey) {
      throw new InvalidArgumentError(
        "idempotencyKey is required."
      );
    }

    this._id = id;

    this._accountId = accountId;

    this._idempotencyKey = idempotencyKey;

    this._amount =
      HoldEntity.parseMinorUnits(amount);

    this._currency =
      currency?.toUpperCase();

    this._description =
      description;

    this._expiresAt =
      expiresAt
        ? new Date(expiresAt)
        : null;

    this._status =
      HoldEntity.normalizeStatus(
        status
      );

    this._createdAt =
      new Date(createdAt);

    this._metadata =
      { ...metadata };
  }

  //--------------------------------------------------------
  // Getters
  //--------------------------------------------------------

  get id() {
    return this._id;
  }

  get accountId() {
    return this._accountId;
  }

  get idempotencyKey() {
    return this._idempotencyKey;
  }

  get amount() {
    return this._amount;
  }

  get currency() {
    return this._currency;
  }

  get status() {
    return this._status;
  }

  get expiresAt() {
    return this._expiresAt;
  }

  //--------------------------------------------------------
  // Queries
  //--------------------------------------------------------

  isActive() {
    return (
      this._status ===
      HoldEntity.STATUS.ACTIVE
    );
  }

  isReleased() {
    return (
      this._status ===
      HoldEntity.STATUS.RELEASED
    );
  }

  isCaptured() {
    return (
      this._status ===
      HoldEntity.STATUS.CAPTURED
    );
  }

  isExpired(
    now = new Date()
  ) {

    return (
      this._expiresAt !== null &&
      this._expiresAt.getTime() <=
        now.getTime()
    );
  }

  canReserve(
    now = new Date()
  ) {

    return (
      this.isActive() &&
      !this.isExpired(now)
    );
  }

  //--------------------------------------------------------
  // Commands
  //--------------------------------------------------------

  release(
    now = new Date()
  ) {

    this.assertActive(now);

    this._status =
      HoldEntity.STATUS.RELEASED;
  }

  capture(
    now = new Date()
  ) {

    this.assertActive(now);

    this._status =
      HoldEntity.STATUS.CAPTURED;
  }

  expire(
    now = new Date()
  ) {

    if (
      !this.isActive()
    ) {
      return;
    }

    if (
      !this.isExpired(now)
    ) {
      throw new InvalidStateError(
        "Hold has not expired."
      );
    }

    this._status =
      HoldEntity.STATUS.EXPIRED;
  }

  //--------------------------------------------------------
  // Guards
  //--------------------------------------------------------

  assertActive(
    now = new Date()
  ) {

    if (
      this._status !==
      HoldEntity.STATUS.ACTIVE
    ) {
      throw new InvalidStateError(
        `Hold is ${this._status}.`
      );
    }

    if (
      this.isExpired(now)
    ) {
      throw new InvalidStateError(
        "Hold has expired."
      );
    }
  }

  //--------------------------------------------------------
  // Serialization
  //--------------------------------------------------------

  toJSON() {

    return {

      id:
        this._id,

      accountId:
        this._accountId,

      idempotencyKey:
        this._idempotencyKey,

      amount:
        this._amount,

      currency:
        this._currency,

      description:
        this._description,

      status:
        this._status,

      expiresAt:
        this._expiresAt,

      createdAt:
        this._createdAt,

      metadata:
        this._metadata,

    };
  }

  //--------------------------------------------------------
  // Utilities
  //--------------------------------------------------------

  static normalizeStatus(
    status
  ) {

    const normalized =
      String(status)
        .trim()
        .toUpperCase();

    if (
      !Object.values(
        HoldEntity.STATUS
      ).includes(normalized)
    ) {
      throw new InvalidArgumentError(
        `Invalid hold status '${status}'.`
      );
    }

    return normalized;
  }

  static parseMinorUnits(
    value
  ) {

    if (
      typeof value ===
      "bigint"
    ) {
      return value;
    }

    if (
      value === null ||
      value === undefined
    ) {
      throw new InvalidArgumentError(
        "Amount is required."
      );
    }

    const normalized =
      String(value).trim();

    if (
      normalized.includes(".")
    ) {
      throw new InvalidArgumentError(
        "Amount must be integer minor units."
      );
    }

    return BigInt(
      normalized
    );
  }

}