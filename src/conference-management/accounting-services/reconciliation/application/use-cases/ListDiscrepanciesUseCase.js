// reconciliation/application/use_cases/ListDiscrepanciesUseCase.js

export class ListDiscrepanciesUseCase {

    constructor({

        reconciliationRepository,

    }) {

        this.reconciliationRepository = reconciliationRepository;

    }

    async execute(query) {

        return this.reconciliationRepository.findOpenDiscrepancies(

            query.status,

        );

    }

}