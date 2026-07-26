// src/conference-management/registration/index.js
// Composition Root for Registration Sub-Module within Conference Management

import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";
import { PostgresOutboxRepository } from "../../shared/Infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import { RegistrationRepository } from "./infrastructure/repositories/RegistrationRepository.js";
import { ConferenceRepository } from "./infrastructure/repositories/ConferenceRepository.js";

import { CreateRegistrationUseCase } from "./application/user-cases/CreateRegistrationUseCase.js";
import { GetRegistrationUseCase } from "./application/user-cases/GetRegistrationUseCase.js";
import { GetAllRegistrationsUseCase } from "./application/user-cases/GetAllRegistrationsUseCase.js";
import { UpdateRegistrationUseCase } from "./application/user-cases/UpdateRegistrationUseCase.js";
import { CancelRegistrationUseCase } from "./application/user-cases/CancelRegistrationUseCase.js";
import { CheckInRegistrationUseCase } from "./application/user-cases/CheckInRegistrationUseCase.js";

import { RegistrationController } from "./api/registration.controller.js";
import { getRegistrationRoutes } from "./api/registration.route.js";

/**
 * Composition Root for Conference Registration sub-module.
 */
export function createConferenceRegistrationSubModule({ db, logger, config }) {
  // 1. Fail fast on core system dependencies
  if (!db) throw new Error("ConferenceRegistrationSubModule: 'db' connection is required.");
  if (!logger) throw new Error("ConferenceRegistrationSubModule: 'logger' is required.");

  // 2. UnitOfWork - single source of truth for transactions within this module
  const uow = new UnitOfWork(db);

  // 3. Infrastructure - Local UoW binding
  const registrationRepository = new RegistrationRepository({ uow });
  const conferenceRepository = new ConferenceRepository({ uow });
  const outboxRepository = new PostgresOutboxRepository({ uow });

  // 4. Application Use Cases
  const createRegistrationUseCase = new CreateRegistrationUseCase({
    registrationRepository,
    conferenceRepository,
    outboxRepository,
    uow,
    logger,
  });

  const getRegistrationUseCase = new GetRegistrationUseCase({
    registrationRepository,
    logger,
  });

  const getAllRegistrationsUseCase = new GetAllRegistrationsUseCase({
    registrationRepository,
    logger,
  });

  const updateRegistrationUseCase = new UpdateRegistrationUseCase({
    registrationRepository,
    outboxRepository,
    uow,
    logger,
  });

  const cancelRegistrationUseCase = new CancelRegistrationUseCase({
    registrationRepository,
    outboxRepository,
    uow,
    logger,
  });

  const checkInRegistrationUseCase = new CheckInRegistrationUseCase({
    registrationRepository,
    outboxRepository,
    uow,
    logger,
  });

  // 5. Presentation Layer
  const registrationController = new RegistrationController({
    createRegistrationUseCase,
    getRegistrationUseCase,
    getAllRegistrationsUseCase,
    updateRegistrationUseCase,
    cancelRegistrationUseCase,
    checkInRegistrationUseCase,
  });

  const router = getRegistrationRoutes(registrationController);

  let subscriptionToken = null;

  // 6. Public Surface Boundary
  return {
    router,

    /**
     * Bind module-specific cross-context event subscribers
     */
    subscribe: (eventBus) => {
      if (!eventBus) {
        logger.warn("ConferenceRegistrationSubModule: No eventBus provided. Skipping event subscriptions.");
        return;
      }

      // Auto-cancel registrations when a conference deletion event occurs
      subscriptionToken = eventBus.subscribe('conference.deleted', async (evt) => {
        const { conferenceId, correlationId } = evt || {};

        if (!conferenceId) {
          logger.warn({ evt }, "ConferenceRegistrationSubModule: Received 'conference.deleted' without conferenceId.");
          return;
        }

        logger.info(
          { conferenceId, correlationId },
          "ConferenceRegistrationSubModule: Processing auto-cancellation for deleted conference."
        );

        try {
          await cancelRegistrationUseCase.execute({
            conferenceId,
            reason: 'CONFERENCE_CANCELLED',
            correlationId,
          });
        } catch (err) {
          logger.error(
            { err, conferenceId, correlationId },
            "Failed to execute cancelRegistrationUseCase following conference.deleted event"
          );
        }
      });
    },

    start: async () => {
      logger.info('Conference Registration sub-module initialized and ready.');
    },

    stop: async (eventBus) => {
      if (subscriptionToken && eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe('conference.deleted', subscriptionToken);
      }
      logger.info('Conference Registration sub-module cleanly stopped.');
    },
  };
}