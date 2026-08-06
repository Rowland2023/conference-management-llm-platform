// reconciliation/application/use_cases/ResolveDiscrepancyUseCase.js

import { DiscrepancyResolved } from "../../domain/events/DiscrepancyResolved.js";

export class ResolveDiscrepancyUseCase {

    constructor({

        reconciliationRepository,

        transactionManager,

        eventBus,

    }) {

        this.reconciliationRepository = reconciliationRepository;
        this.transactionManager = transactionManager;
        this.eventBus = eventBus;

    }

    async execute(command) {

        return this.transactionManager.runInTransaction(async (tx) => {

            const reconciliation =
                await this.reconciliationRepository.findById(
                    command.reconciliationId,
                    tx,
                );

            const discrepancy =
                reconciliation.discrepancies.find(

                    d => d.id === command.discrepancyId,

                );

            if (!discrepancy) {

                throw new Error("Discrepancy not found.");

            }

            discrepancy.resolve();

            await this.reconciliationRepository.save(
                reconciliation,
                tx,
            );

            await this.eventBus.publish(

                new DiscrepancyResolved({

                    reconciliationId: reconciliation.id,

                    discrepancyId: discrepancy.id,

                    resolvedBy: command.resolvedBy,

                }),

                tx,

            );

            return discrepancy;

        });

    }

}