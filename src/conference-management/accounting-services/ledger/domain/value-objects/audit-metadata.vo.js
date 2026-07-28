/**
 * @file src/domain/value-objects/audit-metadata.vo.js
 *
 * Immutable Value Object encapsulating trace vectors,
 * actor attribution, and origin context for ledger events.
 */

import { randomUUID } from "node:crypto";

import {
  InvalidArgumentError,
} from "../error/index.js";

export default class AuditMetadata {

  /**
   * @param {Object} params
   * @param {string} [params.actorId]
   * @param {string} [params.correlationId]
   * @param {string|null} [params.ipAddress]
   * @param {string|null} [params.userAgent]
   * @param {string|Date} [params.recordedAt]
   */
  constructor({
    actorId,
    correlationId,
    ipAddress = null,
    userAgent = null,
    recordedAt = null,
  } = {}) {

    const cleanActor =
      typeof actorId === "string" &&
      actorId.trim() !== ""
        ? actorId.trim()
        : "SYSTEM";

    const cleanCorrelation =
      typeof correlationId === "string" &&
      correlationId.trim() !== ""
        ? correlationId.trim()
        : randomUUID();

    const timestamp =
      recordedAt
        ? new Date(recordedAt)
        : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      throw new InvalidArgumentError(
        "AuditMetadata: invalid recordedAt timestamp."
      );
    }

    this._actorId =
      cleanActor;

    this._correlationId =
      cleanCorrelation;

    this._ipAddress =
      typeof ipAddress === "string"
        ? ipAddress.trim()
        : null;

    this._userAgent =
      typeof userAgent === "string"
        ? userAgent.trim()
        : null;

    this._recordedAt =
      timestamp.toISOString();

    Object.freeze(this);
  }

  //---------------------------------------------------------
  // Getters
  //---------------------------------------------------------

  get actorId() {
    return this._actorId;
  }

  get correlationId() {
    return this._correlationId;
  }

  get ipAddress() {
    return this._ipAddress;
  }

  get userAgent() {
    return this._userAgent;
  }

  get recordedAt() {
    return this._recordedAt;
  }

  //---------------------------------------------------------
  // Factory Methods
  //---------------------------------------------------------

  /**
   * Creates metadata for background workers,
   * schedulers, or system processes.
   *
   * @param {string} [processName="SYSTEM"]
   * @param {string|null} [correlationId]
   * @returns {AuditMetadata}
   */
  static system(
    processName = "SYSTEM",
    correlationId = null
  ) {

    return new AuditMetadata({

      actorId:
        `SYSTEM:${processName.toUpperCase()}`,

      correlationId,

    });
  }

  /**
   * Creates metadata directly from an
   * Express/Fastify request.
   *
   * @param {Object} req
   * @param {string} [actorId="ANONYMOUS"]
   * @returns {AuditMetadata}
   */
  static fromRequest(
    req,
    actorId = "ANONYMOUS"
  ) {

    if (!req) {
      return new AuditMetadata({
        actorId,
      });
    }

    const correlationId =
      req.headers?.["x-correlation-id"] ??
      req.headers?.["x-request-id"] ??
      req.id;

    const ipAddress =
      req.headers?.["x-forwarded-for"]
        ?.split(",")[0]
        ?.trim() ??
      req.socket?.remoteAddress ??
      req.ip ??
      null;

    const userAgent =
      req.headers?.["user-agent"] ??
      null;

    return new AuditMetadata({

      actorId,

      correlationId,

      ipAddress,

      userAgent,

    });
  }

  //---------------------------------------------------------
  // Equality
  //---------------------------------------------------------

  equals(other) {

    return (
      other instanceof AuditMetadata &&
      this._actorId ===
        other.actorId &&
      this._correlationId ===
        other.correlationId &&
      this._ipAddress ===
        other.ipAddress &&
      this._userAgent ===
        other.userAgent &&
      this._recordedAt ===
        other.recordedAt
    );
  }

  //---------------------------------------------------------
  // Serialization
  //---------------------------------------------------------

  toJSON() {

    return {

      actorId:
        this._actorId,

      correlationId:
        this._correlationId,

      ipAddress:
        this._ipAddress,

      userAgent:
        this._userAgent,

      recordedAt:
        this._recordedAt,

    };
  }

  toString() {

    return `[Actor: ${this._actorId} | Trace: ${this._correlationId} | At: ${this._recordedAt}]`;
  }

}