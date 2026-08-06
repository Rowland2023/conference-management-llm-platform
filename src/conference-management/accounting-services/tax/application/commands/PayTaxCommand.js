// tax/application/commands/PayTaxCommand.js

export class PayTaxCommand {

    constructor({

        taxId,

        paymentReference,

        paidAt = new Date(),

    }) {

        this.taxId =
            taxId;

        this.paymentReference =
            paymentReference;

        this.paidAt =
            paidAt;

        Object.freeze(this);

    }

}