// src/conference-management/ticket/application/commands/TicketCommandService.js

import {
  NotFoundError,
  ConcurrencyConflictError,
  DomainError,
} from "../../../../shared/domain/error/DomainErrors.js";

import { withRetry } from "../../../../shared/utils/retry.js";

export class TicketCommandService {
  #ticketRepository;
  #conferenceRepository;
  #outboxRepository;
  #unitOfWork;
  #logger;
  #metrics;
  #tracer;

  constructor({
    ticketRepository,
    conferenceRepository,
    outboxRepository,
    unitOfWork,
    logger,
    metrics,
    tracer,
  }) {
    this.#ticketRepository = ticketRepository;
    this.#conferenceRepository = conferenceRepository;
    this.#outboxRepository = outboxRepository;
    this.#unitOfWork = unitOfWork;
    this.#logger = logger;
    this.#metrics = metrics;
    this.#tracer = tracer;
  }

  async reserveTicket(command) {
    const {
      ticketId,
      userId,
      quantity,
      correlationId,
      idempotencyKey,
    } = command;

    const log = this.#logger.child({
      correlationId,
      ticketId,
      userId,
      operation: "reserveTicket",
    });

    const started = process.hrtime.bigint();

    return this.#tracer.startActiveSpan(
      "TicketCommandService.reserveTicket",
      async (span) => {

        span.setAttributes({
          "ticket.id": ticketId,
          "user.id": userId,
          "reservation.quantity": quantity,
          "correlation.id": correlationId,
        });

        this.#metrics.counter("ticket.reserve.requests").inc();

        log.info(
          {
            quantity,
            idempotencyKey,
          },
          "Ticket reservation started"
        );

        try {

          const ticket = await withRetry(
            async () =>
              this.#unitOfWork.execute(async (trx) => {

                //------------------------------------
                // Idempotency
                //------------------------------------

                const cached =
                  await this.#ticketRepository.findByIdempotencyKey(
                    idempotencyKey,
                    trx
                  );

                if (cached) {

                  this.#metrics
                    .counter("ticket.reserve.idempotency_hits")
                    .inc();

                  log.info(
                    { idempotencyKey },
                    "Idempotent request"
                  );

                  return cached;
                }

                //------------------------------------
                // Load Aggregate
                //------------------------------------

                const ticket =
                  await this.#ticketRepository.findById(
                    ticketId,
                    trx
                  );

                if (!ticket) {

                  log.warn(
                    { ticketId },
                    "Ticket not found"
                  );

                  throw new NotFoundError(
                    `Ticket ${ticketId} not found`
                  );
                }

                //------------------------------------
                // Domain
                //------------------------------------

                ticket.reserve(
                  quantity,
                  userId,
                  correlationId
                );

                //------------------------------------
                // Persist Aggregate
                //------------------------------------

                await this.#ticketRepository.save(
                  ticket,
                  trx
                );

                //------------------------------------
                // Outbox
                //------------------------------------

                await this.#outboxRepository.store(
                  ticket.pullEvents(),
                  trx
                );

                //------------------------------------
                // Idempotency Record
                //------------------------------------

                await this.#ticketRepository
                  .saveIdempotencyKey(
                    idempotencyKey,
                    ticket.id,
                    trx
                  );

                return ticket;
              }),
            {
              retries: 3,

              onRetry: (err, attempt) => {

                if (!(err instanceof ConcurrencyConflictError))
                  return false;

                this.#metrics
                  .counter("ticket.reserve.retries")
                  .inc();

                log.warn(
                  {
                    attempt,
                    error: err.message,
                  },
                  "Retrying optimistic concurrency conflict"
                );

                return true;
              },
            }
          );

          //------------------------------------
          // Success
          //------------------------------------

          this.#metrics
            .counter("ticket.reserve.success")
            .inc();

          span.setStatus({
            code: 1,
          });

          log.info(
            {
              version: ticket.version,
              available: ticket.available,
            },
            "Ticket reserved successfully"
          );

          return ticket;
        }

        //----------------------------------------
        // Business Failures
        //----------------------------------------

        catch (err) {

          if (err instanceof DomainError) {

            this.#metrics
              .counter("ticket.reserve.business_failure")
              .inc();

            log.warn(
              {
                error: err.message,
                code: err.code,
              },
              "Reservation rejected"
            );

            span.recordException(err);

            throw err;
          }

          //----------------------------------------
          // Infrastructure Failures
          //----------------------------------------

          this.#metrics
            .counter("ticket.reserve.system_failure")
            .inc();

          log.error(
            {
              error: err,
            },
            "Unexpected reservation failure"
          );

          span.recordException(err);

          throw err;
        }

        finally {

          const elapsed =
            Number(process.hrtime.bigint() - started) / 1_000_000;

          this.#metrics
            .histogram("ticket.reserve.duration.ms")
            .observe(elapsed);

          log.info(
            {
              durationMs: elapsed,
            },
            "Reservation completed"
          );

          span.end();
        }
      }
    );
  }
}