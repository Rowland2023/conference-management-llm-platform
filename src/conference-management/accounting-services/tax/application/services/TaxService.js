// tax/application/services/TaxService.js

export class TaxService {

    constructor({

        calculateTaxUseCase,

        recordTaxUseCase,

        payTaxUseCase,

        getTaxUseCase,

        listTaxesUseCase,

    }) {

        this.calculateTaxUseCase =
            calculateTaxUseCase;

        this.recordTaxUseCase =
            recordTaxUseCase;

        this.payTaxUseCase =
            payTaxUseCase;

        this.getTaxUseCase =
            getTaxUseCase;

        this.listTaxesUseCase =
            listTaxesUseCase;

    }


    //--------------------------------------------------
    // Commands
    //--------------------------------------------------

    async calculate(command) {

        return this.calculateTaxUseCase.execute(

            command,

        );

    }


    async record(command) {

        return this.recordTaxUseCase.execute(

            command,

        );

    }


    async pay(command) {

        return this.payTaxUseCase.execute(

            command,

        );

    }


    //--------------------------------------------------
    // Queries
    //--------------------------------------------------

    async get(query) {

        return this.getTaxUseCase.execute(

            query,

        );

    }


    async list(query) {

        return this.listTaxesUseCase.execute(

            query,

        );

    }

}