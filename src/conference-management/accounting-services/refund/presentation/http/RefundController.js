/**
 * @file refund/presentation/http/RefundController.js
 *
 * Refund HTTP Controller.
 *
 * Thin HTTP adapter.
 * Delegates refund operations to RefundService.
 */

export default class RefundController {


    constructor({

        refundService,

    }) {


        this.refundService =
            refundService;

    }





    /**
     * POST /refunds
     */
    createRefund = async (req, res, next) => {

        try {


            const refund =
                await this.refundService.processRefund({

                    ...req.body,


                    tenantId:
                        req.actor?.tenantId,


                    actor:
                        req.actor,


                    idempotencyKey:
                        req.headers["idempotency-key"] ||
                        req.body?.idempotencyKey,


                    correlationId:
                        req.correlationId,

                });




            return res.status(201).json({

                success: true,

                data: refund,

            });



        } catch(error) {

            next(error);

        }

    };


}