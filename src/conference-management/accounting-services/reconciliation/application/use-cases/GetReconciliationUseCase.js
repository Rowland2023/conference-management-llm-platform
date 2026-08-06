// reconciliation/application/use_cases/GetReconciliationUseCase.js

import { ReconciliationResponse } from "../dto/ReconciliationResponse.js";

export class GetReconciliationUseCase {

    constructor({

        reconciliationRepository,

    }) {

        this.reconciliationRepository = reconciliationRepository;

    }

    async execute(query) {

        const reconciliation =
            await this.reconciliationRepository.findById(
                query.reconciliationId,
            );

        return new ReconciliationResponse({

            id: reconciliation.id,

            type: reconciliation.type,

            status: reconciliation.status,

            startedAt: reconciliation.startedAt,

            completedAt: reconciliation.completedAt,

            discrepancies: reconciliation.discrepancies,

        });

    }

}