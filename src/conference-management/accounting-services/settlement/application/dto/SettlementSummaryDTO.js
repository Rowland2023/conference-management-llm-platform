export class SettlementSummaryDTO {

    constructor({

        totalSettlements,

        totalAmount,

        pending,

        completed,

        failed,

    }) {

        this.totalSettlements = totalSettlements;
        this.totalAmount = totalAmount;
        this.pending = pending;
        this.completed = completed;
        this.failed = failed;

    }

}