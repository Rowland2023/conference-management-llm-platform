// invoice/application/services/InvoiceService.js

export class InvoiceService {

    constructor({

        createInvoiceUseCase,

        issueInvoiceUseCase,

        cancelInvoiceUseCase,

        getInvoiceUseCase,

        listInvoicesUseCase,

    }) {

        this.createInvoiceUseCase =
            createInvoiceUseCase;

        this.issueInvoiceUseCase =
            issueInvoiceUseCase;

        this.cancelInvoiceUseCase =
            cancelInvoiceUseCase;

        this.getInvoiceUseCase =
            getInvoiceUseCase;

        this.listInvoicesUseCase =
            listInvoicesUseCase;

    }


    async create(command) {

        return this.createInvoiceUseCase.execute(
            command
        );

    }


    async issue(command) {

        return this.issueInvoiceUseCase.execute(
            command
        );

    }


    async cancel(command) {

        return this.cancelInvoiceUseCase.execute(
            command
        );

    }


    async get(query) {

        return this.getInvoiceUseCase.execute(
            query
        );

    }


    async list(query) {

        return this.listInvoicesUseCase.execute(
            query
        );

    }

}