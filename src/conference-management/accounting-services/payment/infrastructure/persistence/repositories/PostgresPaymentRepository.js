// src/conference-management/accounting-services/payment/infrastructure/persistence/repositories/PostgresPaymentRepository.js

import { IPaymentRepository } from "../../../domain/repositories/IPaymentRepository.js";
import {
  ConflictError,
  InternalError,
} from "../../../domain/errors/PaymentErrors.js";

export class PostgresPaymentRepository extends IPaymentRepository {
  constructor({ db, paymentMapper }) {
    super();

    if (!db) {
      throw new InternalError(
        "PostgresPaymentRepository requires a database client."
      );
    }

    if (!paymentMapper) {
      throw new InternalError(
        "PostgresPaymentRepository requires a payment mapper."
      );
    }

    this.db = db;
    this.paymentMapper = paymentMapper;
  }

  // ============================================================
  // CREATE
  // ============================================================

  async save(payment, options = {}) {
    const client = options.transaction || this.db;

    const query = `
      INSERT INTO payments (
        id,
        version,
        tenant_id,
        context_id,
        context_type,
        amount,
        currency,
        status,
        user_id,
        email,
        seller_id,
        gateway,
        external_reference,
        checkout_url,
        gateway_transaction_id,
        gateway_failure,
        paid_at,
        released_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      )
      RETURNING *
    `;

    const values = [
      payment.id,
      payment.version ?? 0,
      payment.tenantId,
      payment.contextId,
      payment.contextType,
      payment.amount,
      payment.currency,
      payment.status,
      payment.userId,
      payment.email,
      payment.sellerId,
      payment.gateway,
      payment.externalReference,
      payment.checkoutUrl,
      payment.gatewayTransactionId,
      payment.gatewayFailure
        ? JSON.stringify(payment.gatewayFailure)
        : null,
      payment.paidAt,
      payment.releasedAt,
      payment.createdAt,
      payment.updatedAt,
    ];

    try {
      const result = await client.query(query, values);

      return this.paymentMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // ============================================================
  // FIND BY ID
  // ============================================================

  async findById(paymentId, options = {}) {
    const client = options.transaction || this.db;

    const query = `
      SELECT *
      FROM payments
      WHERE id = $1
      LIMIT 1
    `;

    const result = await client.query(query, [paymentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.paymentMapper.toDomain(result.rows[0]);
  }

  // ============================================================
  // FIND BY ID + PESSIMISTIC LOCK
  // ============================================================

  async findByIdForUpdate(paymentId, transaction) {
    if (!transaction) {
      throw new InternalError(
        "Pessimistic row locking requires an active database transaction."
      );
    }

    const query = `
      SELECT *
      FROM payments
      WHERE id = $1
      FOR UPDATE
    `;

    const result = await transaction.query(query, [paymentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.paymentMapper.toDomain(result.rows[0]);
  }

  // ============================================================
  // FIND BY IDEMPOTENCY KEY
  // ============================================================
  //
  // IMPORTANT:
  // Your current Payment aggregate does NOT contain an
  // idempotencyKey property.
  //
  // Therefore this method cannot correctly work yet unless
  // idempotency_key exists in the domain model.
  //
  // We leave this method here because CreatePaymentUseCase
  // currently requires it.
  //
  // See explanation below.
  // ============================================================

  async findByIdempotencyKey(idempotencyKey, options = {}) {
    const client = options.transaction || this.db;

    const query = `
      SELECT *
      FROM payments
      WHERE idempotency_key = $1
      LIMIT 1
    `;

    const result = await client.query(query, [idempotencyKey]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.paymentMapper.toDomain(result.rows[0]);
  }

  // ============================================================
  // FIND BY GATEWAY TRANSACTION ID
  // ============================================================

  async findByGatewayTransactionId(
    gatewayTransactionId,
    options = {}
  ) {
    const client = options.transaction || this.db;

    const query = `
      SELECT *
      FROM payments
      WHERE gateway_transaction_id = $1
      LIMIT 1
    `;

    const result = await client.query(
      query,
      [gatewayTransactionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.paymentMapper.toDomain(result.rows[0]);
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(payment, options = {}) {
    const client = options.transaction || this.db;

    const query = `
      UPDATE payments
      SET
        version = $2,
        status = $3,
        seller_id = $4,
        gateway_transaction_id = $5,
        external_reference = $6,
        checkout_url = $7,
        gateway_failure = $8,
        paid_at = $9,
        released_at = $10,
        updated_at = $11
      WHERE id = $1
        AND version = $12
      RETURNING *
    `;

    const currentVersion = payment.version ?? 0;

    const values = [
      payment.id,
      currentVersion + 1,
      payment.status,
      payment.sellerId,
      payment.gatewayTransactionId,
      payment.externalReference,
      payment.checkoutUrl,
      payment.gatewayFailure
        ? JSON.stringify(payment.gatewayFailure)
        : null,
      payment.paidAt,
      payment.releasedAt,
      payment.updatedAt,
      currentVersion,
    ];

    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      throw new ConflictError(
        `Optimistic concurrency failure: Payment aggregate ${payment.id} was modified by another transaction.`
      );
    }

    return this.paymentMapper.toDomain(result.rows[0]);
  }

  // ============================================================
  // EXISTS
  // ============================================================

  async exists(paymentId, options = {}) {
    const client = options.transaction || this.db;

    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM payments
        WHERE id = $1
      ) AS exists
    `;

    const result = await client.query(
      query,
      [paymentId]
    );

    return result.rows[0].exists;
  }
}