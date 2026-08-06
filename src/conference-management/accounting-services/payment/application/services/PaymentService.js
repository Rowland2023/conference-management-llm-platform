/**
 * @file payment/application/services/PaymentService.js
 *
 * Payment Application Service.
 *
 * Coordinates payment application operations.
 * Controllers depend on this service instead of individual use cases.
 *
 * No business logic belongs here.
 */

export class PaymentService {


    constructor({

        createPaymentUseCase,

        refundPaymentUseCase,

        getPaymentByIdUseCase,

        getAllPaymentsUseCase,

    }) {


        this.createPaymentUseCase =
            createPaymentUseCase;


        this.refundPaymentUseCase =
            refundPaymentUseCase;


        this.getPaymentByIdUseCase =
            getPaymentByIdUseCase;


        this.getAllPaymentsUseCase =
            getAllPaymentsUseCase;

    }




    //--------------------------------------------------
    // Commands
    //--------------------------------------------------


    async createPayment(command) {

        return await this.createPaymentUseCase.execute(
            command
        );

    }




    async refundPayment(command) {

        return await this.refundPaymentUseCase.execute(
            command
        );

    }





    //--------------------------------------------------
    // Queries
    //--------------------------------------------------


    async getPaymentById(query) {

        return await this.getPaymentByIdUseCase.execute(
            query
        );

    }




    async getAllPayments(query) {

        return await this.getAllPaymentsUseCase.execute(
            query
        );

    }


}