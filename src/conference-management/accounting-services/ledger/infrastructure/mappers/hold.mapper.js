/**
 * @file hold.mapper.js
 *
 * Maps between PostgreSQL persistence rows and
 * HoldEntity domain objects.
 */

import HoldEntity from "../../domain/aggregates/account/hold.entity.js";

class HoldMapper {
  static #toBigInt(value) {
    if (value === null || value === undefined) {
      return 0n;
    }

    if (typeof value === "bigint") {
      return value;
    }

    return BigInt(value.toString());
  }

  static #parseMetadata(metadata) {
    if (!metadata) {
      return {};
    }

    if (typeof metadata === "object") {
      return metadata;
    }

    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }

  static toDomain(row) {
    if (!row) {
      return null;
    }

    return new HoldEntity({
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      amount: this.#toBigInt(row.amount),
      currency: row.currency,
      reason: row.reason,
      status: row.status,
      reference: row.reference,
      idempotencyKey: row.idempotency_key,
      correlationId: row.correlation_id,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
      metadata: this.#parseMetadata(row.metadata),
    });
  }

  static toPersistence(entity) {
    if (!entity) {
      return null;
    }

    const json =
      typeof entity.toJSON === "function"
        ? entity.toJSON()
        : entity;

    const amount =
      json.amount ??
      json.amountInMinorUnits ??
      entity.amount;

    return {
      id: json.id,
      tenant_id: json.tenantId,
      account_id: json.accountId,
      amount: this.#toBigInt(amount).toString(),
      currency: json.currency,
      reason: json.reason,
      status: json.status,
      reference: json.reference,
      idempotency_key: json.idempotencyKey,
      correlation_id: json.correlationId,
      metadata: JSON.stringify(json.metadata ?? {}),
      expires_at: json.expiresAt ? new Date(json.expiresAt) : null,
      created_at: json.createdAt ? new Date(json.createdAt) : undefined,
      updated_at: new Date(),
    };
  }
}

export default HoldMapper;