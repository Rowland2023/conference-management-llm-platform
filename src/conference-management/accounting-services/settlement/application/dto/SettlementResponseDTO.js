export class SettlementResponseDTO {

    constructor({

        id,

        merchantId,

        amount,

        currency,

        method,

        status,

        scheduledAt,

    }) {

        this.id = id;
        this.merchantId = merchantId;
        this.amount = amount;
        this.currency = currency;
        this.method = method;
        this.status = status;
        this.scheduledAt = scheduledAt;

    }

}