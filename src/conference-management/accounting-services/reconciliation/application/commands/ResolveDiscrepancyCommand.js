// reconciliation/application/commands/ResolveDiscrepancyCommand.js

export class ResolveDiscrepancyCommand {

    constructor({

        reconciliationId,

        discrepancyId,

        resolvedBy,

    }) {

        this.reconciliationId = reconciliationId;

        this.discrepancyId = discrepancyId;

        this.resolvedBy = resolvedBy;

    }

}