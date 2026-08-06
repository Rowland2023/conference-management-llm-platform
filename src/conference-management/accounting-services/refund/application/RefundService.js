/**
 * @file refund/application/RefundService.js
 *
 * Refund Application Service.
 *
 * Application boundary for refund operations.
 * Controllers depend on this service instead of use cases directly.
 *
 * No business logic belongs here.
 */

export default class RefundService {


    constructor({

        processRefundUseCase,

    }) {


        this.processRefundUseCase =
            processRefundUseCase;

    }





    //--------------------------------------------------
    // Commands
    //--------------------------------------------------


    async processRefund(command) {


        return await this.processRefundUseCase.execute(
            command
        );


    }


}