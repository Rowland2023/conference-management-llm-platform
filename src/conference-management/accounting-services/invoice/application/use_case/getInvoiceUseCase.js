/**
 * @typedef {import("../ports/InvoiceRepository.js").InvoiceRepository}
 * InvoiceRepository
 */

export class InvoiceNotFoundError extends Error {

    /**
     * @param {string} invoiceId
     */
    constructor(invoiceId) {

        super(
            `Invoice with ID "${invoiceId}" was not found.`
        );

        this.name =
            "InvoiceNotFoundError";

        this.statusCode =
            404;

    }

}


export class GetInvoiceUseCase {

    constructor({
        invoiceRepository,
    }) {

        if (!invoiceRepository) {

            throw new Error(
                "GetInvoiceUseCase: invoiceRepository is required."
            );

        }

        this.invoiceRepository =
            invoiceRepository;

    }


    async execute({

        invoiceId,

        trx = undefined,

    }) {

        if (
            !invoiceId ||
            typeof invoiceId !== "string" ||
            !invoiceId.trim()
        ) {

            const error =
                new Error(
                    "A valid invoice ID is required."
                );

            error.name =
                "ValidationError";

            error.statusCode =
                400;

            throw error;

        }


        const invoice =
            await this.invoiceRepository.findById(
                invoiceId.trim(),
                trx
            );


        if (!invoice) {

            throw new InvoiceNotFoundError(
                invoiceId.trim()
            );

        }


        return invoice;

    }

}