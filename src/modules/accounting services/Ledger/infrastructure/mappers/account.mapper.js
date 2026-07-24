/**
 * @file src/modules/ledger/infrastructure/mappers/account.mapper.js
 * 
 * Data Mapper responsible for translating between raw PostgreSQL DB rows 
 * and pure AccountAggregate domain entities.
 */
const AccountAggregate = require('../../domain/aggregates/account.aggregate');

class AccountMapper {
  /**
   * Safely converts any numeric value (BigInt, string, number) to a BigInt.
   * Prevent float precision errors and undefined crashes.
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
   * Translates database rows into a pure Account Domain Aggregate.
   * 
   * @param {Object|null} rawAccount - Raw database row from `accounts` table
   * @returns {AccountAggregate|null}
   */
  static toDomain(rawAccount) {
    if (!rawAccount) return null;

    return new AccountAggregate({
      id: rawAccount.id,
      tenantId: rawAccount.tenant_id,
      accountNumber: rawAccount.account_number,
      name: rawAccount.name,
      currency: rawAccount.currency,
      type: rawAccount.type,
      status: rawAccount.status,
      balance: {
        available: this._toBigInt(rawAccount.available_balance),
        pending: this._toBigInt(rawAccount.pending_balance),
      },
      metadata: typeof rawAccount.metadata === 'string' 
        ? JSON.parse(rawAccount.metadata) 
        : (rawAccount.metadata || {}),
      createdAt: rawAccount.created_at ? new Date(rawAccount.created_at) : null,
      updatedAt: rawAccount.updated_at ? new Date(rawAccount.updated_at) : null,
    });
  }

  /**
   * Translates an Account Domain Aggregate into a Knex persistence row.
   * Converts BigInt balance minor units to strings for safe numeric DB column storage.
   * 
   * @param {AccountAggregate} aggregate
   * @returns {Object} DB persistence row formatted for Knex
   */
  static toPersistence(aggregate) {
    if (!aggregate) return null;

    // Support both aggregate methods or direct instance props
    const json = typeof aggregate.toJSON === 'function' ? aggregate.toJSON() : aggregate;
    const balance = json.balance || aggregate.balance || {};

    return {
      id: json.id,
      tenant_id: json.tenantId,
      account_number: json.accountNumber,
      name: json.name,
      currency: json.currency,
      type: json.type,
      status: json.status,
      // Convert BigInt minor units to String to avoid JS 64-bit float precision loss
      available_balance: this._toBigInt(balance.available).toString(),
      pending_balance: this._toBigInt(balance.pending).toString(),
      metadata: json.metadata ? JSON.stringify(json.metadata) : JSON.stringify({}),
      created_at: json.createdAt ? new Date(json.createdAt) : undefined,
      updated_at: new Date(),
    };
  }
}

module.exports = AccountMapper;