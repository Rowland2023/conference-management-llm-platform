// src/conference-management/payment/application/commands/PaymentCommandService.js

import crypto from "node:crypto";

import {
  DomainError,
  NotFoundError,
  ConcurrencyConflictError,
} from "../../../../../shared/domain/error/DomainErrors.js";

import { PaymentGatewayUnavailableError } from "../../../../../shared/application/errors/ApplicationErrors.js";

import { Payment } from "../../domain/entities/Payment.js";
import { withRetry } from "../../../../../shared/utils/retry.js";

export class PaymentCommandService {
  #paymentRepository;
  #outboxRepository;
  #paymentGateway;
  #unitOfWork;
  #logger;
  #metrics;
  #tracer;

  constructor({
    paymentRepository,
    outboxRepository,
    paymentGateway,
    unitOfWork,
    logger,
    metrics,
    tracer,
  }) {
    this.#paymentRepository = paymentRepository;
    this.#outboxRepository = outboxRepository;
    this.#paymentGateway = paymentGateway;
    this.#unitOfWork = unitOfWork;
    this.#logger = logger;
    this.#metrics = metrics;
    this.#tracer = tracer;
  }

  async processPayment(command) {
    const {
      orderId,
      amount,
      currency,
      paymentMethod,
      correlationId,
      idempotencyKey,
    } = command;

    const started = process.hrtime.bigint();

    const log = this.#logger.child({
      correlationId,
      orderId,
      operation: "processPayment",
    });

    return this.#tracer.startActiveSpan(
      "PaymentCommandService.processPayment",
      async (span) => {

        span.setAttributes({
          "payment.order_id": orderId,
          "payment.amount": amount,
          "payment.currency": currency,
        });

        this.#metrics.counter("payment.requests").inc();

        log.info(
          {
            amount,
            currency,
            paymentMethod,
          },
          "Payment processing started"
        );

        try {

          //------------------------------------
          // Idempotency (NO TRANSACTION NEEDED)
          //------------------------------------

          const existing =
            await this.#paymentRepository.findByIdempotencyKey(
              idempotencyKey
            );

          if (existing) {

            this.#metrics
              .counter("payment.idempotency_hits")
              .inc();

            log.info(
              { idempotencyKey },
              "Returning cached payment"
            );

            return existing;
          }

          //------------------------------------
          // Charge PSP (OUTSIDE DB TRANSACTION)
          //------------------------------------

          log.info("Charging external payment gateway");

          let gatewayResult;

          try {

            gatewayResult =
              await this.#paymentGateway.charge({
                amount,
                currency,
                paymentMethod,
                metadata: {
                  orderId,
                  correlationId,
                },
              });

          } catch (err) {

            this.#metrics
              .counter("payment.gateway_failures")
              .inc();

            log.error(
              { error: err.message },
              "Payment gateway unavailable"
            );

            throw new PaymentGatewayUnavailableError(
              "Unable to reach payment gateway",
              err
            );
          }

          //------------------------------------
          // Persist Atomically
          //------------------------------------

          const payment = await withRetry(

            () => this.#unitOfWork.execute(async (trx) => {

              const payment = Payment.create({
                id: crypto.randomUUID(),
                orderId,
                amount,
                currency,
              });

              if (gatewayResult.status === "SUCCESS") {

                payment.complete(
                  gatewayResult.reference
                );

              } else {

                payment.fail(
                  gatewayResult.failureReason
                );
              }

              await this.#paymentRepository.save(
                payment,
                trx
              );

              await this.#paymentRepository
                .saveIdempotencyKey(
                  idempotencyKey,
                  payment.id,
                  trx
                );

              await this.#outboxRepository.store(
                payment.pullEvents(),
                trx
              );

              return payment;

            }),

            {
              retries: 3,

              onRetry: (err, attempt) => {

                if (!(err instanceof ConcurrencyConflictError))
                  return false;

                this.#metrics
                  .counter("payment.retries")
                  .inc();

                log.warn(
                  {
                    attempt,
                    error: err.message,
                  },
                  "Retrying transaction"
                );

                return true;
              },
            }

          );

          //------------------------------------
          // Success
          //------------------------------------

          this.#metrics
            .counter("payment.success")
            .inc();

          log.info(
            {
              paymentId: payment.id,
              status: payment.status,
            },
            "Payment processed successfully"
          );

          return payment;
        }

        //------------------------------------
        // Business failures
        //------------------------------------

        catch (err) {

          if (err instanceof DomainError) {

            this.#metrics
              .counter("payment.business_failures")
              .inc();

            log.warn(
              {
                code: err.code,
                error: err.message,
              },
              "Payment rejected"
            );

            span.recordException(err);

            throw err;
          }

          //------------------------------------
          // Infrastructure failures
          //------------------------------------

          this.#metrics
            .counter("payment.system_failures")
            .inc();

          log.error(
            {
              err,
            },
            "Unexpected payment failure"
          );

          span.recordException(err);

          throw err;
        }

        finally {

          const duration =
            Number(process.hrtime.bigint() - started) / 1_000_000;

          this.#metrics
            .histogram("payment.duration.ms")
            .observe(duration);

          log.info(
            {
              durationMs: duration,
            },
            "Payment processing completed"
          );

          span.end();
        }

      }
    );
  }
}