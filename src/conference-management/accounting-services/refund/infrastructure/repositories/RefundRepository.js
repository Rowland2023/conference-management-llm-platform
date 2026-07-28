/**
 * @file infrastructure/repositories/RefundRepository.js
 * @description Knex repository for persisting and reconstituting Refund aggregate roots.
 */

import Refund from "../../domain/Refund.js";
import RefundStatus from "../../domain/RefundStatus.js";

export class RefundRepository {
  /**
   * @param {Object} params
   * @param {import('knex').Knex} params.knex
   */
  constructor({ knex }) {
    this.knex = knex;
    this.tableName = "refunds";
  }

  /**
   * Retrieves a refund aggregate by idempotency key.
   */
  async findByIdempotencyKey(
    idempotencyKey,
    { trx = null, forUpdate = false } = {}
  ) {
    let qb = (trx || this.knex)(this.tableName)
      .where({
        idempotency_key: idempotencyKey,
      })
      .first();

    if (forUpdate && trx) {
      qb = qb.forUpdate();
    }

    const row = await qb;

    return row
      ? this._toDomain(row)
      : null;
  }

  /**
   * Calculates total active/committed refunded amount.
   */
  async getTotalRefundedAmount(
    transactionId,
    { trx = null } = {}
  ) {
    const activeStatuses = [
      RefundStatus.REQUESTED,
      RefundStatus.PENDING_APPROVAL,
      RefundStatus.PROCESSING,
      RefundStatus.COMPLETED,
    ].map((status) =>
      status instanceof RefundStatus
        ? status.value
        : status
    );

    const result = await (trx || this.knex)(
      this.tableName
    )
      .where({
        transaction_id: transactionId,
      })
      .whereIn(
        "status",
        activeStatuses
      )
      .sum("amount as total")
      .first();

    if (
      !result ||
      result.total === null ||
      result.total === undefined
    ) {
      return 0.0;
    }

    return typeof result.total === "string"
      ? parseFloat(result.total)
      : Number(result.total);
  }

  /**
   * Inserts a new Refund entity.
   */
  async save(
    refund,
    { trx = null } = {}
  ) {
    const data = {
      id: refund.id,

      idempotency_key:
        refund.idempotencyKey,

      transaction_id:
        refund.transactionId,

      account_id:
        refund.accountId,

      amount:
        refund.amount.amount,

      currency:
        refund.amount.currency,

      reason:
        refund.reason,

      status:
        this._unwrapStatus(
          refund.status
        ),

      gateway_reference:
        refund.gatewayReference,

      created_at:
        refund.createdAt,

      updated_at:
        refund.updatedAt,
    };

    await (trx || this.knex)(
      this.tableName
    ).insert(data);
  }

  /**
   * Updates state and gateway attributes.
   */
  async updateStatus(
    refund,
    { trx = null } = {}
  ) {
    await (trx || this.knex)(
      this.tableName
    )
      .where({
        id: refund.id,
      })
      .update({
        status:
          this._unwrapStatus(
            refund.status
          ),

        gateway_reference:
          refund.gatewayReference,

        updated_at:
          refund.updatedAt,
      });
  }

  /**
   * Safely unwraps RefundStatus Value Object.
   */
  _unwrapStatus(status) {
    if (typeof status === "string") {
      return status;
    }

    if (
      status &&
      typeof status.value === "string"
    ) {
      return status.value;
    }

    if (
      status &&
      typeof status.toString === "function"
    ) {
      return status.toString();
    }

    return String(status);
  }

  /**
   * Reconstitutes domain aggregate from SQL row.
   */
  _toDomain(row) {
    return new Refund({
      id: row.id,

      idempotencyKey:
        row.idempotency_key,

      transactionId:
        row.transaction_id,

      accountId:
        row.account_id,

      amount: {
        amount:
          typeof row.amount === "string"
            ? parseFloat(row.amount)
            : Number(row.amount),

        currency:
          row.currency,
      },

      reason:
        row.reason,

      status:
        row.status,

      gatewayReference:
        row.gateway_reference,

      createdAt:
        row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at),

      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at
          : new Date(row.updated_at),
    });
  }
}