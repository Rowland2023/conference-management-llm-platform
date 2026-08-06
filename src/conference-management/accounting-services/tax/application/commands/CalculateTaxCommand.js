// tax/application/commands/CalculateTaxCommand.js

export class CalculateTaxCommand {

    constructor({

        transactionId,

        taxpayerId,

        taxType,

        taxableAmount,

        currency,

    }) {

        this.transactionId =
            transactionId;

        this.taxpayerId =
            taxpayerId;

        this.taxType =
            taxType;

        this.taxableAmount =
            taxableAmount;

        this.currency =
            currency;

        Object.freeze(this);

    }

}