/**
 * @file postgres-hold.repository.js
 *
 * PostgreSQL implementation of HoldRepository.
 *
 * Responsibilities:
 * - Persist account holds
 * - Guarantee idempotency
 * - Tenant isolation
 * - Row-level locking
 * - Query active holds
 */

import db
  from "../../../../../cross-cutting/database/knex.js";

import HoldMapper
  from "../mappers/hold.mapper.js";

export class PostgresHoldRepository {

  async save(
    holdAggregate,
    options = {}
  ) {

    const client =
      this.#getClient(options);

    const row =
      HoldMapper.toPersistence(
        holdAggregate
      );

    if (!row.tenant_id) {
      throw new Error(
        "tenant_id is required"
      );
    }

    await client("account_holds")
      .insert(row)
      .onConflict([
        "tenant_id",
        "idempotency_key",
      ])
      .merge({

        status:
          row.status,

        reason:
          row.reason,

        metadata:
          row.metadata,

        expires_at:
          row.expires_at,

        updated_at:
          row.updated_at,

      });

  }

  async findById(
    tenantId,
    id,
    options = {}
  ) {

    this.#requireTenant(tenantId);

    const client =
      this.#getClient(options);

    const row =
      await client("account_holds")
        .where({

          tenant_id:
            tenantId,

          id,

        })
        .first();

    return HoldMapper.toDomain(row);

  }

  async findByIdempotencyKey(
    tenantId,
    idempotencyKey,
    options = {}
  ) {

    this.#requireTenant(tenantId);

    if (!idempotencyKey) {
      return null;
    }

    const client =
      this.#getClient(options);

    const row =
      await client("account_holds")
        .where({

          tenant_id:
            tenantId,

          idempotency_key:
            idempotencyKey,

        })
        .first();

    return HoldMapper.toDomain(row);

  }

  async findByIdForUpdate(
    tenantId,
    id,
    options = {}
  ) {

    this.#requireTenant(tenantId);

    const client =
      this.#getTransaction(options);

    const row =
      await client("account_holds")
        .where({

          tenant_id:
            tenantId,

          id,

        })
        .forUpdate()
        .first();

    return HoldMapper.toDomain(row);

  }

  async findActiveByAccountId(
    tenantId,
    accountId,
    options = {}
  ) {

    this.#requireTenant(tenantId);

    if (!accountId) {
      throw new Error(
        "accountId is required"
      );
    }

    const client =
      this.#getClient(options);

    const now =
      new Date();

    const rows =
      await client("account_holds")
        .where({

          tenant_id:
            tenantId,

          account_id:
            accountId,

          status:
            "PENDING",

        })
        .where(function () {

          this
            .whereNull("expires_at")
            .orWhere(
              "expires_at",
              ">",
              now
            );

        })
        .orderBy(
          "created_at",
          "asc"
        );

    return rows.map(
      HoldMapper.toDomain
    );

  }

  #getClient(options) {

    return (
      options.transaction ??
      options.session ??
      db
    );

  }

  #getTransaction(options) {

    const transaction =
      options.transaction ??
      options.session;

    if (!transaction) {
      throw new Error(
        "Transaction is required for row locking."
      );
    }

    return transaction;

  }

  #requireTenant(
    tenantId
  ) {

    if (!tenantId) {
      throw new Error(
        "tenantId is required."
      );
    }

  }

}