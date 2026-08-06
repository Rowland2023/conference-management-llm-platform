// reconciliation/application/commands/StartReconciliationCommand.js

export class StartReconciliationCommand {

    constructor({

        type,

        createdBy,

    }) {

        this.type = type;

        this.createdBy = createdBy;

    }

}