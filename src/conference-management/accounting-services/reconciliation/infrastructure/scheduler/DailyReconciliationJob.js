// reconciliation/infrastructure/scheduler/DailyReconciliationJob.js

export class DailyReconciliationJob {

    constructor({

        reconciliationService,

    }) {

        this.reconciliationService =
            reconciliationService;

    }

    async run() {

        await this.reconciliationService.runDailyReconciliation({

            type: "DAILY",

        });

    }

}