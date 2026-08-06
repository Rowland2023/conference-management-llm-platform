// application/services/ReconciliationService.js

export class ReconciliationService {

    constructor({

        startReconciliationUseCase,

        detectDiscrepanciesUseCase,

        completeReconciliationUseCase,

    }) {

        this.startReconciliationUseCase =
            startReconciliationUseCase;

        this.detectDiscrepanciesUseCase =
            detectDiscrepanciesUseCase;

        this.completeReconciliationUseCase =
            completeReconciliationUseCase;

    }

    async runDailyReconciliation(command) {

        const reconciliation =
            await this.startReconciliationUseCase.execute(command);

        await this.detectDiscrepanciesUseCase.execute({

            reconciliationId:
                reconciliation.id,

        });

        return await this.completeReconciliationUseCase.execute({

            reconciliationId:
                reconciliation.id,

        });

    }

}