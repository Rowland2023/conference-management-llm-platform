/**
 * @file src/presentation/controllers/hold.controller.js
 *
 * HoldController - Thin HTTP adapter.
 */

export default class HoldController {

    constructor({

        ledgerService,

    }) {

        this.ledgerService =
            ledgerService;

    }


    /**
     * POST /holds
     */
    createHold = async (req, res, next) => {

        try {

            const idempotencyKey =

                req.headers["idempotency-key"]

                ||

                req.idempotencyKey;


            const correlationId =
                req.correlationId;


            const result =
                await this.ledgerService.createHold({

                    accountId:
                        req.body.accountId,

                    amount:
                        req.body.amount,

                    currency:
                        req.body.currency,

                    reference:
                        req.body.reference,

                    reason:
                        req.body.reason,

                    expiresAt:
                        req.body.expiresAt,

                    idempotencyKey,

                    correlationId,

                    tenantId:
                        req.actor?.tenantId,

                    actor:
                        req.actor,

                });


            //--------------------------------------------------
            // Idempotent Replay
            //--------------------------------------------------

            if (result.data?.isDuplicate) {

                res.set(

                    "Idempotency-Replayed",

                    "true"

                );

                return res.status(200).json(result);

            }


            return res
                .status(201)
                .json(result);

        }

        catch (error) {

            next(error);

        }

    };


    /**
     * POST /holds/:id/release
     */
    releaseHold = async (req, res, next) => {

        try {

            const idempotencyKey =

                req.headers["idempotency-key"]

                ||

                req.idempotencyKey;


            const correlationId =
                req.correlationId;


            const result =
                await this.ledgerService.releaseHold({

                    id:
                        req.params.id,

                    reason:
                        req.body.reason,

                    idempotencyKey,

                    correlationId,

                    tenantId:
                        req.actor?.tenantId,

                    actor:
                        req.actor,

                });


            if (result.data?.isDuplicate) {

                res.set(

                    "Idempotency-Replayed",

                    "true"

                );

            }


            return res
                .status(200)
                .json(result);

        }

        catch (error) {

            next(error);

        }

    };

}