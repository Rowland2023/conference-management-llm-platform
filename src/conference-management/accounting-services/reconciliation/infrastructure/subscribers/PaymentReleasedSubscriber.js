// reconciliation/infrastructure/subscribers/PaymentReleasedSubscriber.js

export class PaymentReleasedSubscriber {

    constructor({

        reconciliationService,

    }) {

        this.reconciliationService =
            reconciliationService;

    }

    async handle(event) {

        await this.reconciliationService.processPayment(

            event.payload,

        );

    }

}