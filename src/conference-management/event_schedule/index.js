// src/conference-management/event_schedule/index.js
// Composition Root for Event Schedule sub-module inside Conference Management

import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";
import { PostgresEventRepository } from "./infrastructure/repositories/PostgresEventRepository.js";
import { PostgresOutboxRepository } from "../../shared/Infrastructure/messaging/outbox/PostgresOutboxRepository.js";
import { OutboxWorker as OutboxPublisherWorker } from "../../shared/Infrastructure/messaging/outbox/outboxworker.js";

// Domain Service
import { EventSchedulingService } from "./domain/service/Eventscheduling.service.js";

// Use Cases
import { CreateEventUseCase } from "./application/use-case/create-event.usecase.js";
import { RescheduleEventUseCase } from "./application/use-case/reschedule-event.usecase.js";
import { CancelEventUseCase } from "./application/use-case/cancel-event.usecase.js";
import { GetEventUseCase } from "./application/use-case/get-event.usecase.js";
import { ListEventsUseCase } from "./application/use-case/list-event.usecase.js";

// API Layer
import { EventController } from "./api/controllers/event.controllers.js";
import { createEventRouter } from "./api/routes/event.routes.js";

export function createConferenceEventScheduleSubModule({ dbConnection, eventBus, logger }) {
  // 1. Fail Fast Dependency Validation
  if (!dbConnection) throw new Error("ConferenceEventScheduleSubModule: 'dbConnection' is required.");
  if (!logger) throw new Error("ConferenceEventScheduleSubModule: 'logger' is required.");
  if (!eventBus) throw new Error("ConferenceEventScheduleSubModule: 'eventBus' is required.");

  // 2. Transactional Scope
  const uow = new UnitOfWork(dbConnection);

  // 3. Repositories
  const eventRepository = new PostgresEventRepository({ uow });
  const outboxRepository = new PostgresOutboxRepository({ uow });

  // 4. Domain Services
  const eventSchedulingService = new EventSchedulingService({ eventRepository });

  // 5. Application Use Cases
  const createEventUseCase = new CreateEventUseCase({
    eventRepository,
    outboxRepository,
    eventSchedulingService,
    uow,
    logger,
  });
  const rescheduleEventUseCase = new RescheduleEventUseCase({
    eventRepository,
    outboxRepository,
    eventSchedulingService,
    uow,
    logger,
  });
  const cancelEventUseCase = new CancelEventUseCase({
    eventRepository,
    outboxRepository,
    eventSchedulingService,
    uow,
    logger,
  });
  const getEventUseCase = new GetEventUseCase({ eventRepository, logger });
  const listEventsUseCase = new ListEventsUseCase({ eventRepository, logger });

  // 6. Outbox Worker
  const outboxWorker = new OutboxPublisherWorker({
    outboxRepository,
    eventBus,
    logger,
  });

  // 7. Presentation
  const eventController = new EventController({
    createEventUseCase,
    rescheduleEventUseCase,
    cancelEventUseCase,
    getEventUseCase,
    listEventsUseCase,
  });

  const eventRouter = createEventRouter({ eventController });

  let subscriptionToken = null;

  return {
    eventRouter,

    // Inbound In-Process Integration
    subscribe: () => {
      subscriptionToken = eventBus.subscribe('booking.payment_confirmed', async (evt) => {
        try {
          await createEventUseCase.execute({
            bookingId: evt.payload.bookingId,
            slotId: evt.payload.slotId,
            correlationId: evt.correlationId,
          });
        } catch (err) {
          logger.error({ err, eventId: evt.id }, "Failed to process booking.payment_confirmed event in Event Schedule");
        }
      });
    },

    start: async () => {
      logger.info('Starting Conference Event Schedule Outbox Worker...');
      await outboxWorker.start();
    },

    stop: async () => {
      logger.info('Stopping Conference Event Schedule Outbox Worker...');
      if (subscriptionToken && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe('booking.payment_confirmed', subscriptionToken);
      }
      await outboxWorker.stop();
    },
  };
}