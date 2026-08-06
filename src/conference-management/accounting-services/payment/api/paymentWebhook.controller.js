/**
 * @file payment/api/paymentWebhook.controller.js
 *
 * HTTP adapter for payment provider callbacks.
 */

export class PaymentWebhookController {


    constructor({

        paymentWebhookService,

    }) {


        this.paymentWebhookService =
            paymentWebhookService;

    }





    /**
     * POST /payments/webhooks/paystack
     */
    handlePaystackWebhook = async (req, res, next) => {

        try {


            await this.paymentWebhookService
                .handlePaystackWebhook({

                    payload: req.body,

                    signature:
                        req.headers["x-paystack-signature"],

                    correlationId:
                        req.correlationId,

                });



            return res.status(200).json({

                received: true,

            });


        } catch(err) {

            next(err);

        }

    };






    /**
     * POST /payments/webhooks/stripe
     */
    handleStripeWebhook = async (req, res, next) => {

        try {


            await this.paymentWebhookService
                .handleStripeWebhook({

                    payload: req.body,

                    signature:
                        req.headers["stripe-signature"],

                    correlationId:
                        req.correlationId,

                });



            return res.status(200).json({

                received: true,

            });


        } catch(err) {

            next(err);

        }

    };


}