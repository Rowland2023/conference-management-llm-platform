// settlement/application/commands/CreateSettlementCommand.js

export class CreateSettlementCommand {

    constructor({

        merchantId,

        amount,

        currency,

        method,

    }) {

        this.merchantId = merchantId;
        this.amount = amount;
        this.currency = currency;
        this.method = method;

    }

}