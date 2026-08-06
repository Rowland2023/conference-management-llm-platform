// reconciliation/application/dto/ReconciliationResponse.js

export class ReconciliationResponse {

    constructor({

        id,

        type,

        status,

        startedAt,

        completedAt,

        discrepancies = [],

    }) {

        this.id = id;

        this.type = type;

        this.status = status;

        this.startedAt = startedAt;

        this.completedAt = completedAt;

        this.discrepancies = discrepancies;

    }

}