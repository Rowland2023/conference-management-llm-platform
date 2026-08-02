// src/conference-management/registration/index.js

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

export function createConferenceRegistrationSubModule({
    db,
    unitOfWorkFactory,
    eventBus,
    logger,
}) {

    //----------------------------------------------------------
    // Fail Fast Dependency Validation
    //----------------------------------------------------------

    if (!db)
        throw new Error(
            "ConferenceRegistrationSubModule: 'db' is required."
        );

    if (!unitOfWorkFactory)
        throw new Error(
            "ConferenceRegistrationSubModule: 'unitOfWorkFactory' is required."
        );

    if (!eventBus)
        throw new Error(
            "ConferenceRegistrationSubModule: 'eventBus' is required."
        );

    if (!logger)
        throw new Error(
            "ConferenceRegistrationSubModule: 'logger' is required."
        );

    //----------------------------------------------------------
    // Transaction Scope
    //----------------------------------------------------------

    const uow = unitOfWorkFactory();

    //----------------------------------------------------------
    // Repositories
    //----------------------------------------------------------

    const registrationRepository =
        new RegistrationRepository({
            uow,
        });

    const conferenceRepository =
        new ConferenceRepository({
            uow,
        });

    const outboxRepository =
        new PostgresOutboxRepository({
            db,
        });

    //----------------------------------------------------------
    // Application Services
    //----------------------------------------------------------

    const createRegistrationUseCase =
        new CreateRegistrationUseCase({
            registrationRepository,
            conferenceRepository,
            outboxRepository,
            uow,
            logger,
        });

    const getRegistrationUseCase =
        new GetRegistrationUseCase({
            registrationRepository,
            logger,
        });

    const getAllRegistrationsUseCase =
        new GetAllRegistrationsUseCase({
            registrationRepository,
            logger,
        });

    const updateRegistrationUseCase =
        new UpdateRegistrationUseCase({
            registrationRepository,
            outboxRepository,
            uow,
            logger,
        });

    const cancelRegistrationUseCase =
        new CancelRegistrationUseCase({
            registrationRepository,
            outboxRepository,
            uow,
            logger,
        });

    const checkInRegistrationUseCase =
        new CheckInRegistrationUseCase({
            registrationRepository,
            outboxRepository,
            uow,
            logger,
        });

    //----------------------------------------------------------
// Presentation
//----------------------------------------------------------

const registrationController =
    new RegistrationController({
        createRegistrationUseCase,
        getRegistrationUseCase,
        getAllRegistrationsUseCase,
        updateRegistrationUseCase,
        cancelRegistrationUseCase,
        checkInRegistrationUseCase,
        logger,
    });

    const router =
    getRegistrationRoutes(registrationController);

    //----------------------------------------------------------
    // Integration
    //----------------------------------------------------------

    let subscriptionToken = null;

    return {

    name: "registration",

    basePath: "/registrations",

    router,

    subscribe() {

        subscriptionToken =
            eventBus.subscribe(
                "conference.deleted",
                async (evt) => {

                    const {
                        conferenceId,
                        correlationId,
                    } = evt ?? {};

                    if (!conferenceId) {

                        logger.warn(
                            "Received conference.deleted without conferenceId.",
                            { evt }
                        );

                        return;
                    }

                    try {

                        await cancelRegistrationUseCase.execute({
                            conferenceId,
                            reason: "CONFERENCE_CANCELLED",
                            correlationId,
                        });

                    } catch (err) {

                        logger.error(
                            "Failed to process conference.deleted event.",
                            {
                                err,
                                conferenceId,
                                correlationId,
                            }
                        );

                    }
                }
            );

    },

    async start() {

        logger.info(
            "Conference Registration sub-module initialized."
        );

    },

    async stop() {

        if (
            subscriptionToken &&
            typeof eventBus.unsubscribe === "function"
        ) {
            eventBus.unsubscribe(
                "conference.deleted",
                subscriptionToken
            );
        }

        logger.info(
            "Conference Registration sub-module stopped."
        );

    },

};

}