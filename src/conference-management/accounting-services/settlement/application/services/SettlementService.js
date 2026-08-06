// settlement/application/services/SettlementService.js

export class SettlementService {

    constructor({

        createSettlementUseCase,

        scheduleSettlementUseCase,

        executeSettlementUseCase,

        cancelSettlementUseCase,

    }) {

        this.createSettlementUseCase =
            createSettlementUseCase;

        this.scheduleSettlementUseCase =
            scheduleSettlementUseCase;

        this.executeSettlementUseCase =
            executeSettlementUseCase;

        this.cancelSettlementUseCase =
            cancelSettlementUseCase;

    }

    async create(command) {

        return this.createSettlementUseCase.execute(command);

    }

    async schedule(command) {

        return this.scheduleSettlementUseCase.execute(command);

    }

    async execute(command) {

        return this.executeSettlementUseCase.execute(command);

    }

    async cancel(command) {

        return this.cancelSettlementUseCase.execute(command);

    }

}