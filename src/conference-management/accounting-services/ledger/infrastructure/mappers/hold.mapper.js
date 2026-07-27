/**
 * @file src/modules/ledger/infrastructure/mappers/hold.mapper.js
 * 
 * Data Mapper responsible for translating between raw PostgreSQL database rows
 * (`account_holds` table) and pure HoldAggregate domain entities.
 */
const HoldAggregate = require('../../domain/aggregates/hold.aggregate');

class HoldMapper {
  /**
   * Safely converts any numeric, string, or BigInt input to BigInt minor units.
   * 
   * @private
   * @param {string|number|bigint|null|undefined} val 
   * @returns {bigint}
   */
  static _toBigInt(val) {
    if (val === null || val === undefined) return 0n;
    if (typeof val === 'bigint') return val;
    return BigInt(val.toString());
  }

  /**
   * Safely parses JSON metadata from database rows to avoid crashing read queries.
   * 
   * @private
   * @param {string|Object|null} metadata 
   * @returns {Object}
   */
  static _parseMetadata(metadata) {
    if (!metadata) return {};
    if (typeof metadata === 'object') return metadata;
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }

  /**
   * Reconstitutes a raw PostgreSQL database row into a HoldAggregate domain model.
   * 
   * @param {Object|null} rawHold - Raw DB row from `account_holds` table
   * @returns {HoldAggregate|null}
   */
  static toDomain(rawHold) {
    if (!rawHold) return null;

    return new HoldAggregate({
      id: rawHold.id,
      tenantId: rawHold.tenant_id,
      accountId: rawHold.account_id,
      amount: this._toBigInt(rawHold.amount),
      currency: rawHold.currency,
      reason: rawHold.reason,
      status: rawHold.status,
      reference: rawHold.reference,
      idempotencyKey: rawHold.idempotency_key, // Enables replay protection
      correlationId: rawHold.correlation_id,   // Enables distributed tracing
      expiresAt: rawHold.expires_at ? new Date(rawHold.expires_at) : null,
      createdAt: rawHold.created_at ? new Date(rawHold.created_at) : null,
      updatedAt: rawHold.updated_at ? new Date(rawHold.updated_at) : null,
      metadata: this._parseMetadata(rawHold.metadata),
    });
  }

  /**
   * Translates a Hold Aggregate into a Knex DB persistence row.
   * 
   * @param {HoldAggregate} aggregate
   * @returns {Object} DB persistence row formatted for Knex
   */
  static toPersistence(aggregate) {
    if (!aggregate) return null;

    const json = typeof aggregate.toJSON === 'function' ? aggregate.toJSON() : aggregate;
    const rawAmount = json.amount ?? json.amountInMinorUnits ?? aggregate.amount;

    return {
      id: json.id,
      tenant_id: json.tenantId || aggregate.tenantId,
      account_id: json.accountId,
      amount: this._toBigInt(rawAmount).toString(), // Guarantees string format for PostgreSQL NUMERIC/BIGINT
      currency: json.currency,
      reason: json.reason,
      status: json.status,
      reference: json.reference,
      idempotency_key: json.idempotencyKey,
      correlation_id: json.correlationId,
      metadata: typeof json.metadata === 'object' ? JSON.stringify(json.metadata || {}) : (json.metadata || '{}'),
      expires_at: json.expiresAt ? new Date(json.expiresAt) : null,
      created_at: json.createdAt ? new Date(json.createdAt) : undefined,
      updated_at: new Date(),
    };
  }
}

module.exports = HoldMapper;