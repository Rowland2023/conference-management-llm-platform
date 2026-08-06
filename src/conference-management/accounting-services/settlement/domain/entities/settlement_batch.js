// settlement/domain/entities/SettlementBatch.js

import { randomUUID } from "crypto";

export class SettlementBatch {

    constructor({

        id = randomUUID(),

        settlements = [],

    }) {

        this.id = id;

        this.settlements = settlements;

    }

    addSettlement(settlement) {

        this.settlements.push(

            settlement

        );

    }

    totalAmount() {

        return this.settlements.reduce(

            (sum, settlement) =>

                sum + settlement.amount,

            0,

        );

    }

}