/**
 * @file refund/application/ProcessRefundUseCase.js
 *
 * Handles refund processing workflow.
 *
 * Application service responsible for coordinating:
 * - Refund aggregate lifecycle
 * - Payment gateway interaction
 * - Persistence
 * - Transactional outbox publishing
 */

import Refund from "../domain/Refund.js";


export default class ProcessRefundUseCase {


    constructor({

        refundRepository,

        paymentGatewayAdapter,

        outboxRepository,

        dbTransactionManager,

        logger,

    }) {


        this.refundRepository =
            refundRepository;


        this.paymentGatewayAdapter =
            paymentGatewayAdapter;


        this.outboxRepository =
            outboxRepository;


        this.dbTransactionManager =
            dbTransactionManager;


        this.logger =
            logger;

    }






    async execute(command) {


        const {

            transactionId,

            accountId,

            amount,

            currency = "NGN",

            originalTransactionAmount,

            totalAlreadyRefunded,

            reason,

            idempotencyKey,

            correlationId,

        } = command;







        //--------------------------------------------------
        // 1. Idempotency check
        //--------------------------------------------------

        const existingRefund =
            await this.refundRepository
                .findByIdempotencyKey(
                    idempotencyKey
                );


        if (existingRefund) {

            return existingRefund;

        }







        //--------------------------------------------------
        // 2. Create Refund Aggregate
        //--------------------------------------------------

        const refund =
            Refund.create({

                idempotencyKey,

                transactionId,

                accountId,

                amount,

                currency,

                originalTransactionAmount,

                totalAlreadyRefunded,

                reason,

            });







        //--------------------------------------------------
        // 3. Persist requested refund
        //--------------------------------------------------

        await this.dbTransactionManager.transaction(

            async (trx)=>{


                await this.refundRepository.save(

                    refund,

                    {
                        trx,
                    }

                );


                await this._publishDomainEvents(

                    refund,

                    correlationId,

                    trx

                );


                refund.clearDomainEvents();


            }

        );








        //--------------------------------------------------
        // 4. Execute external refund
        //--------------------------------------------------

        try {


            refund.markProcessing();



            const gatewayResponse =

                await this.paymentGatewayAdapter.refund({

                    transactionId,

                    amount,

                    currency,

                });






            //--------------------------------------------------
            // 5. Complete refund
            //--------------------------------------------------

            refund.markCompleted(

                gatewayResponse.reference

            );





        } catch(error) {


            refund.markFailed(
                error.message
            );



            await this.dbTransactionManager.transaction(

                async (trx)=>{


                    await this.refundRepository.updateStatus(

                        refund,

                        {
                            trx,
                        }

                    );


                    await this._publishDomainEvents(

                        refund,

                        correlationId,

                        trx

                    );


                    refund.clearDomainEvents();


                }

            );



            throw error;

        }







        //--------------------------------------------------
        // 6. Persist final state
        //--------------------------------------------------

        const completedRefund =

            await this.dbTransactionManager.transaction(

                async (trx)=>{


                    await this.refundRepository.updateStatus(

                        refund,

                        {
                            trx,
                        }

                    );



                    await this._publishDomainEvents(

                        refund,

                        correlationId,

                        trx

                    );



                    refund.clearDomainEvents();



                    return refund;


                }

            );








        this.logger.info({

            refundId:
                completedRefund.id,

        }, "Refund completed");






        return completedRefund;


    }








    async _publishDomainEvents(

        refund,

        correlationId,

        trx

    ) {


        for (
            const event of refund.domainEvents
        ) {


            await this.outboxRepository.save({

                aggregateId:
                    refund.id,


                eventType:
                    event.type,


                payload:
                    event.payload,


                correlationId,


            }, trx);


        }

    }


}