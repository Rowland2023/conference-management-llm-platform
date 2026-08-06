// settlement/application/commands/ScheduleSettlementCommand.js

export class ScheduleSettlementCommand {

    constructor({

        settlementId,

        scheduledAt,

    }) {

        this.settlementId = settlementId;
        this.scheduledAt = scheduledAt;

    }

}