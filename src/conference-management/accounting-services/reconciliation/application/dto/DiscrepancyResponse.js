// reconciliation/application/dto/DiscrepancyResponse.js

export class DiscrepancyResponse {

    constructor({

        id,

        transactionId,

        expectedAmount,

        actualAmount,

        reason,

        status,

    }) {

        this.id = id;

        this.transactionId = transactionId;

        this.expectedAmount = expectedAmount;

        this.actualAmount = actualAmount;

        this.reason = reason;

        this.status = status;

    }

}