/**
 * @file src/domain/value-objects/audit-metadata.vo.js
 * 
 * Immutable Value Object encapsulating trace vectors, actor attribution, 
 * and origin context for ledger events and financial state changes.
 */
const crypto = require('crypto');
const { InvalidArgumentError } = require('../errors');

class AuditMetadata {
  /**
   * @param {Object} params
   * @param {string} [params.actorId] ID of the user, API key, or system process (Defaults to 'SYSTEM')
   * @param {string} [params.correlationId] Distributed trace ID (Auto-generated if missing)
   * @param {string|null} [params.ipAddress] Client IP address
   * @param {string|null} [params.userAgent] Client User-Agent string
   * @param {string|Date} [params.recordedAt] Immutable domain capture timestamp
   */
  constructor({ actorId, correlationId, ipAddress = null, userAgent = null, recordedAt = null } = {}) {
    const cleanActor = typeof actorId === 'string' && actorId.trim() !== '' 
      ? actorId.trim() 
      : 'SYSTEM';

    const cleanCorrelation = typeof correlationId === 'string' && correlationId.trim() !== ''
      ? correlationId.trim()
      : crypto.randomUUID(); // Guarantee distributed trace continuity

    const timestamp = recordedAt ? new Date(recordedAt) : new Date();
    if (isNaN(timestamp.getTime())) {
      throw new InvalidArgumentError('AuditMetadata: invalid recordedAt timestamp');
    }

    this._actorId = cleanActor;
    this._correlationId = cleanCorrelation;
    this._ipAddress = typeof ipAddress === 'string' ? ipAddress.trim() : null;
    this._userAgent = typeof userAgent === 'string' ? userAgent.trim() : null;
    this._recordedAt = timestamp.toISOString();

    Object.freeze(this); // Guarantees immutability
  }

  get actorId() { return this._actorId; }
  get correlationId() { return this._correlationId; }
  get ipAddress() { return this._ipAddress; }
  get userAgent() { return this._userAgent; }
  get recordedAt() { return this._recordedAt; }

  // --- Static Factory Methods ---

  /**
   * Factory method for automated background workers, Outbox processors, or cron jobs.
   * @param {string} [processName='SYSTEM']
   * @param {string} [correlationId]
   * @returns {AuditMetadata}
   */
  static system(processName = 'SYSTEM', correlationId = null) {
    return new AuditMetadata({
      actorId: `SYSTEM:${processName.toUpperCase()}`,
      correlationId,
    });
  }

  /**
   * Factory method to extract audit metadata directly from Express/Fastify HTTP request contexts.
   * @param {Object} req - Express/Fastify request object
   * @param {string} [actorId] - Derived from authenticated JWT/session
   * @returns {AuditMetadata}
   */
  static fromRequest(req, actorId = 'ANONYMOUS') {
    if (!req) return new AuditMetadata({ actorId });

    const correlationId = 
      req.headers['x-correlation-id'] || 
      req.headers['x-request-id'] || 
      req.id;

    const ipAddress = 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
      req.socket?.remoteAddress || 
      req.ip;

    const userAgent = req.headers['user-agent'];

    return new AuditMetadata({
      actorId,
      correlationId,
      ipAddress,
      userAgent,
    });
  }

  // --- Utility Methods ---

  equals(other) {
    return (
      other instanceof AuditMetadata &&
      this._actorId === other.actorId &&
      this._correlationId === other.correlationId &&
      this._ipAddress === other.ipAddress &&
      this._userAgent === other.userAgent &&
      this._recordedAt === other.recordedAt
    );
  }

  toJSON() {
    return {
      actorId: this._actorId,
      correlationId: this._correlationId,
      ipAddress: this._ipAddress,
      userAgent: this._userAgent,
      recordedAt: this._recordedAt,
    };
  }

  toString() {
    return `[Actor: ${this._actorId} | Trace: ${this._correlationId} | At: ${this._recordedAt}]`;
  }
}

module.exports = AuditMetadata;