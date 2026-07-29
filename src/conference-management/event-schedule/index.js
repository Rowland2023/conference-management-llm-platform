// src/conference-management/event_schedule/index.js
// src/conference-management/event-schedule/index.js

import { UnitOfWork }
from "../../shared/application/persistence/UnitOfWork.js";

import { OutboxDispatcher } 
from "../../shared/infrastructure/messaging/outbox/OutboxDispatcher.js";

import { PostgresEventRepository }
from "./infrastructure/repositories/PostgresEventRepository.js";


import {
    PostgresOutboxRepository
}
from "../../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";


import { OutboxWorker as OutboxPublisherWorker }
from "../../shared/infrastructure/messaging/outbox/OutboxWorker.js";


// Domain Service
import { EventSchedulingService }
from "./domain/service/Eventscheduling.service.js";


// Use Cases
import { CreateEventUseCase }
from "./application/use-case/create-event.usecase.js";

import { RescheduleEventUseCase }
from "./application/use-case/reschedule-event.usecase.js";

import { CancelEventUseCase }
from "./application/use-case/cancel-event.usecase.js";

import { GetEventUseCase }
from "./application/use-case/get-event.usecase.js";

import { ListEventsUseCase }
from "./application/use-case/list-event.usecase.js";


// API
import { EventController }
from "./api/controllers/event.controllers.js";

import createEventRouter
from "./api/routes/event.routes.js";


export function createConferenceEventScheduleSubModule({
    dbConnection,
    eventBus,
    logger
}) {

    if (!dbConnection)
        throw new Error(
            "ConferenceEventScheduleSubModule: 'dbConnection' is required."
        );

    if (!logger)
        throw new Error(
            "ConferenceEventScheduleSubModule: 'logger' is required."
        );

    if (!eventBus)
        throw new Error(
            "ConferenceEventScheduleSubModule: 'eventBus' is required."
        );


    /*
     * Unit Of Work
     */
    const uow =
        new UnitOfWork(dbConnection);



    /*
     * Repositories
     */
    const eventRepository =
        new PostgresEventRepository({

            knex: dbConnection,

            logger,

        });



    const outboxRepository =
        new PostgresOutboxRepository({

            knex: dbConnection,

            logger,

        });



    /*
     * Domain Service
     */
    const eventSchedulingService =
        new EventSchedulingService({

            eventRepository,

        });



    /*
     * Use Cases
     */
    const createEventUseCase =
        new CreateEventUseCase({

            eventRepository,

            outboxRepository,

            eventSchedulingService,

            uow,

            logger,

        });



    const rescheduleEventUseCase =
        new RescheduleEventUseCase({

            eventRepository,

            outboxRepository,

            eventSchedulingService,

            uow,

            logger,

        });



    const cancelEventUseCase =
        new CancelEventUseCase({

            eventRepository,

            outboxRepository,

            eventSchedulingService,

            uow,

            logger,

        });



    const getEventUseCase =
        new GetEventUseCase({

            eventRepository,

            logger,

        });



    const listEventsUseCase =
        new ListEventsUseCase({

            eventRepository,

            logger,

        });



    /*
     * Outbox Worker
     */
    /*
 * Outbox Dispatcher
 */

const outboxDispatcher =
    new OutboxDispatcher({

        eventBus,

        logger,

    });


/*
 * Outbox Worker
 */

const outboxWorker =
    new OutboxPublisherWorker({

        outboxRepository,

        dispatcher: outboxDispatcher,

        logger,

    });

    console.log(
    "DEBUG EVENT MODULE LOGGER:",
    logger,
    "child:",
    typeof logger?.child
);
    /*
     * Controllers
     */
    const eventController =
    new EventController({

        createEventUseCase,

        getEventByIdUseCase:
            getEventUseCase,

        listEventsUseCase,

        rescheduleEventUseCase,

        cancelEventUseCase,

        logger,

    });


    const eventRouter =
    createEventRouter(eventController);


    let subscriptionToken = null;



    return {

        router: eventRouter,

        useCases: {

            createEventUseCase,

            rescheduleEventUseCase,

            cancelEventUseCase,

            getEventUseCase,

            listEventsUseCase,

        },


        subscribe() {

            subscriptionToken =
                eventBus.subscribe(
                    "booking.payment_confirmed",
                    async(evt)=>{

                        try {

                            await createEventUseCase.execute({

                                bookingId:
                                    evt.payload.bookingId,

                                slotId:
                                    evt.payload.slotId,

                                correlationId:
                                    evt.correlationId,

                            });


                        } catch(error) {

                            logger.error(
                                {
                                    error,
                                    eventId: evt.id
                                },
                                "Failed processing booking.payment_confirmed"
                            );

                        }

                    }
                );

        },


        async start(){

            logger.info(
                "Starting Conference Event Schedule..."
            );

            await outboxWorker.start();

        },


        async stop(){

            logger.info(
                "Stopping Conference Event Schedule..."
            );


            if(subscriptionToken &&
               typeof eventBus.unsubscribe === "function") {

                eventBus.unsubscribe(
                    "booking.payment_confirmed",
                    subscriptionToken
                );

            }


            await outboxWorker.stop();

        }

    };

}