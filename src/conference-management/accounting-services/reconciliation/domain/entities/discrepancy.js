// reconciliation/domain/entities/Discrepancy.js

import { randomUUID } from "crypto";

import { DiscrepancyStatus } from "../value-objects/DiscrepancyStatus.js";

export class Discrepancy {

    constructor({

        id = randomUUID(),

        transactionId,

        expectedAmount,

        actualAmount,

        reason,

        status = DiscrepancyStatus.OPEN,

    }) {

        this.id = id;

        this.transactionId = transactionId;

        this.expectedAmount = expectedAmount;

        this.actualAmount = actualAmount;

        this.reason = reason;

        this.status = status;

    }

    resolve() {

        this.status = DiscrepancyStatus.RESOLVED;

    }

    ignore() {

        this.status = DiscrepancyStatus.IGNORED;

    }

}