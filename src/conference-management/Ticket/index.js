// src/conference-management/ticket/index.js
// Composition Root for Ticket Bounded Context

// Infrastructure
import { TicketModelDefine } from "./infrastructure/schemas/TicketModel.js";
import { TicketMapper } from "./infrastructure/mappers/TicketMapper.js";
import { PostgresTicketRepository } from "./infrastructure/repository/PostgresTicketRepository.js";

// Application
import { TicketCommandService } from "./application/commands/TicketCommandService.js";

// Presentation
import { TicketController } from "./api/ticket.controller.js";
import { createTicketRouter } from "./api/ticket.route.js";


/**
 * Composition Root for Ticket Module
 */
export function createTicketModule({
    db,
    unitOfWorkFactory,
    outboxRepository,
    logger,
}) {

    //----------------------------------------------------------
    // Dependency Validation
    //----------------------------------------------------------

    if (!db) {
        throw new Error(
            "TicketModule: 'db' is required."
        );
    }

    if (!unitOfWorkFactory) {
        throw new Error(
            "TicketModule: 'unitOfWorkFactory' is required."
        );
    }

    if (!outboxRepository) {
        throw new Error(
            "TicketModule: 'outboxRepository' is required."
        );
    }

    if (!logger) {
        throw new Error(
            "TicketModule: 'logger' is required."
        );
    }


    //----------------------------------------------------------
    // Transaction Boundary
    //----------------------------------------------------------

    const uow = unitOfWorkFactory();



    //----------------------------------------------------------
    // Persistence
    //----------------------------------------------------------

    const TicketModel =
        TicketModelDefine(db);


    const ticketMapper =
        new TicketMapper();


    const ticketRepository =
        new PostgresTicketRepository({
            model: TicketModel,
            mapper: ticketMapper,
            transactionManager: uow,
        });



    //----------------------------------------------------------
    // Application Services
    //----------------------------------------------------------

    const ticketCommandService =
        new TicketCommandService({

            ticketRepository,

            outboxRepository,

            unitOfWork: uow,

            logger,

        });



    //----------------------------------------------------------
    // HTTP Boundary
    //----------------------------------------------------------

    const ticketController =
        new TicketController({
            ticketCommandService,
        });


    const router =
        createTicketRouter({
            ticketController,
        });



    //----------------------------------------------------------
    // Event Subscription Lifecycle
    //----------------------------------------------------------

    const subscriptions = [];


    return {


        router,


        subscribe(eventBus) {

            if (!eventBus) {

                logger.warn(
                    "TicketModule: EventBus not supplied."
                );

                return;

            }



            subscriptions.push(

                eventBus.subscribe(
                    "payment.failed",
                    async (event) => {

                        const {
                            ticketId,
                            reason,
                            correlationId,
                        } = event;


                        if (!ticketId) {
                            return;
                        }


                        try {

                            await ticketCommandService.releaseTicket({
                                ticketId,
                                reason:
                                    reason ??
                                    "PAYMENT_FAILED",
                                correlationId,
                            });


                            logger.info(
                                {
                                    ticketId,
                                    correlationId,
                                },
                                "Ticket released after payment failure."
                            );


                        } catch(error) {

                            logger.error(
                                {
                                    error,
                                    ticketId,
                                    correlationId,
                                },
                                "Failed releasing ticket."
                            );

                        }

                    }
                )

            );



            subscriptions.push(

                eventBus.subscribe(
                    "payment.succeeded",
                    async (event) => {

                        const {
                            ticketId,
                            paymentReference,
                            correlationId,
                        } = event;


                        if (!ticketId) {
                            return;
                        }


                        try {

                            await ticketCommandService.confirmPurchase({
                                ticketId,
                                paymentReference,
                                correlationId,
                            });


                            logger.info(
                                {
                                    ticketId,
                                    correlationId,
                                },
                                "Ticket purchase confirmed."
                            );


                        } catch(error) {

                            logger.error(
                                {
                                    error,
                                    ticketId,
                                    correlationId,
                                },
                                "Failed confirming ticket purchase."
                            );

                        }

                    }
                )

            );

        },



        async start() {

            logger.info(
                "Ticket module started."
            );

        },



        async stop(eventBus) {


            if (
                eventBus &&
                typeof eventBus.unsubscribe === "function"
            ) {

                for (const token of subscriptions) {

                    eventBus.unsubscribe(token);

                }

            }


            logger.info(
                "Ticket module stopped."
            );

        },


    };

}