export class InvoiceService {

    constructor({
        createInvoiceUseCase,
        issueInvoiceUseCase,
        cancelInvoiceUseCase,
        recordPaymentUseCase,
        getInvoiceUseCase,
        listInvoicesUseCase,
    }) {

        this.createInvoiceUseCase =
            createInvoiceUseCase;

        this.issueInvoiceUseCase =
            issueInvoiceUseCase;

        this.cancelInvoiceUseCase =
            cancelInvoiceUseCase;

        this.recordPaymentUseCase =
            recordPaymentUseCase;

        this.getInvoiceUseCase =
            getInvoiceUseCase;

        this.listInvoicesUseCase =
            listInvoicesUseCase;
    }

    async create(command) {
        return this.createInvoiceUseCase.execute(command);
    }

    async issue(command) {
        return this.issueInvoiceUseCase.execute(command);
    }

    async cancel(command) {
        return this.cancelInvoiceUseCase.execute(command);
    }

    async recordPayment(command) {
        return this.recordPaymentUseCase.execute(command);
    }

    async get(query) {
        return this.getInvoiceUseCase.execute(query);
    }

    async list(query) {
        return this.listInvoicesUseCase.execute(query);
    }
}