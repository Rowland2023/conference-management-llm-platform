// tax/application/commands/RecordTaxCommand.js

export class RecordTaxCommand {

    constructor({

        taxId,

    }) {

        this.taxId =
            taxId;

        Object.freeze(this);

    }

}