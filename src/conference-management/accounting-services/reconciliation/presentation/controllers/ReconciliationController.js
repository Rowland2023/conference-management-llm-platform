// reconciliation/presentation/controllers/ReconciliationController.js

export class ReconciliationController {

    constructor({

        startReconciliationUseCase,
        resolveDiscrepancyUseCase,
        completeReconciliationUseCase,
        listReconciliationsUseCase,

    }) {

        this.startReconciliationUseCase =
            startReconciliationUseCase;

        this.resolveDiscrepancyUseCase =
            resolveDiscrepancyUseCase;

        this.completeReconciliationUseCase =
            completeReconciliationUseCase;

        this.listReconciliationsUseCase =
            listReconciliationsUseCase;

    }

    start = async (req, res, next) => {

        try {

            const result =
                await this.startReconciliationUseCase.execute({

                    type: req.body.type,

                    createdBy: req.user.id,

                });

            res.status(201).json(result);

        } catch (error) {

            next(error);

        }

    };


    resolve = async (req, res, next) => {

        try {

            const result =
                await this.resolveDiscrepancyUseCase.execute({

                    reconciliationId: req.params.id,

                    discrepancyId: req.body.discrepancyId,

                    resolvedBy: req.user.id,

                });

            res.json(result);

        } catch (error) {

            next(error);

        }

    };


    complete = async (req, res, next) => {

        try {

            const result =
                await this.completeReconciliationUseCase.execute({

                    reconciliationId: req.params.id,

                });

            res.json(result);

        } catch (error) {

            next(error);

        }

    };


    list = async (req, res, next) => {

        try {

            const result =
                await this.listReconciliationsUseCase.execute();

            res.json(result);

        } catch (error) {

            next(error);

        }

    };

}