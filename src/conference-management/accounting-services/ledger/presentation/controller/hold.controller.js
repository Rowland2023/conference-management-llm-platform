/**
 * @file src/presentation/controllers/hold.controller.js
 *
 * HoldController - Thin HTTP adapter. No business logic.
 */

import HoldSerializer from "../serializers/hold.serializer.js";

export default class HoldController {
  constructor({
    holdFundsUseCase,
    releaseHoldUseCase,
  }) {
    this.holdFundsUseCase = holdFundsUseCase;
    this.releaseHoldUseCase = releaseHoldUseCase;
  }

  createHold = async (req, res, next) => {
    try {
      // Deterministic priority: Header > Body, validated by middleware already
      const idempotencyKey =
        req.headers["idempotency-key"] ||
        req.idempotencyKey;

      const correlationId = req.correlationId;

      const hold =
        await this.holdFundsUseCase.execute({
          accountId: req.body.accountId,
          amount: req.body.amount,
          currency: req.body.currency,
          reference: req.body.reference,
          reason: req.body.reason,
          expiresAt: req.body.expiresAt,
          idempotencyKey,
          correlationId,
          tenantId: req.actor.tenantId,
          actor: req.actor,
        });

      // Staff-level: signal idempotent replay
      if (hold.isDuplicate) {
        res.set("Idempotency-Replayed", "true");

        return res.status(200).json({
          success: true,
          data: HoldSerializer.serialize(hold),
        });
      }

      return res.status(201).json({
        success: true,
        data: HoldSerializer.serialize(hold),
      });

    } catch (err) {
      next(err);
    }
  };

  releaseHold = async (req, res, next) => {
    try {
      const idempotencyKey =
        req.headers["idempotency-key"] ||
        req.idempotencyKey;

      const correlationId = req.correlationId;

      const hold =
        await this.releaseHoldUseCase.execute({
          id: req.params.id,
          reason: req.body.reason,
          idempotencyKey,
          correlationId,
          tenantId: req.actor.tenantId,
          actor: req.actor,
        });

      if (hold.isDuplicate) {
        res.set("Idempotency-Replayed", "true");
      }

      return res.status(200).json({
        success: true,
        data: HoldSerializer.serialize(hold),
      });

    } catch (err) {
      next(err);
    }
  };
}