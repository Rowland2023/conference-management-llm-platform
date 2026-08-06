// settlement/application/commands/CancelSettlementCommand.js

export class CancelSettlementCommand {

    constructor({

        settlementId,

        reason,

    }) {

        this.settlementId = settlementId;
        this.reason = reason;

    }

}