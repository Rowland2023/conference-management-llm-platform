import { InvoiceRepository }
    from "../ports/InvoiceRepository.js";


export class ListInvoicesUseCase {

    /**
     * @param {Object} dependencies
     * @param {InvoiceRepository} dependencies.invoiceRepository
     */
    constructor({

        invoiceRepository,

    }) {

        if (!invoiceRepository) {

            throw new Error(
                "ListInvoicesUseCase: invoiceRepository is required."
            );

        }

        this.invoiceRepository =
            invoiceRepository;

    }


    /**
     * List invoices with optional filtering and pagination.
     *
     * @param {Object} [query]
     *
     * @param {string} [query.status]
     * @param {string} [query.clientEmail]
     * @param {string} [query.currency]
     * @param {string} [query.search]
     * @param {number} [query.page=1]
     * @param {number} [query.limit=20]
     * @param {string} [query.sortBy="createdAt"]
     * @param {"asc"|"desc"} [query.sortOrder="desc"]
     * @param {object} [query.trx]
     *
     * @returns {Promise<Object>}
     */
    async execute({

        status = undefined,

        clientEmail = undefined,

        currency = undefined,

        search = undefined,

        page = 1,

        limit = 20,

        sortBy = "createdAt",

        sortOrder = "desc",

        trx = undefined,

    } = {}) {

        //--------------------------------------------------
        // Normalize pagination
        //--------------------------------------------------

        const normalizedPage =
            Number(page);

        const normalizedLimit =
            Number(limit);


        //--------------------------------------------------
        // Validate page
        //--------------------------------------------------

        if (
            !Number.isInteger(normalizedPage) ||
            normalizedPage < 1
        ) {

            const error =
                new Error(
                    "Page must be a positive integer."
                );

            error.name =
                "ValidationError";

            error.statusCode =
                400;

            throw error;

        }


        //--------------------------------------------------
        // Validate limit
        //--------------------------------------------------

        if (
            !Number.isInteger(normalizedLimit) ||
            normalizedLimit < 1 ||
            normalizedLimit > 100
        ) {

            const error =
                new Error(
                    "Limit must be an integer between 1 and 100."
                );

            error.name =
                "ValidationError";

            error.statusCode =
                400;

            throw error;

        }


        //--------------------------------------------------
        // Validate sort order
        //--------------------------------------------------

        const normalizedSortOrder =
            String(sortOrder).toLowerCase();


        if (
            !["asc", "desc"].includes(
                normalizedSortOrder
            )
        ) {

            const error =
                new Error(
                    'Sort order must be either "asc" or "desc".'
                );

            error.name =
                "ValidationError";

            error.statusCode =
                400;

            throw error;

        }


        //--------------------------------------------------
        // Calculate offset
        //--------------------------------------------------

        const offset =
            (normalizedPage - 1) *
            normalizedLimit;


        //--------------------------------------------------
        // Build repository query
        //--------------------------------------------------

        const filters = {

            status,

            clientEmail,

            currency,

            search,

            offset,

            limit: normalizedLimit,

            sortBy,

            sortOrder:
                normalizedSortOrder,

        };


        //--------------------------------------------------
        // Repository
        //--------------------------------------------------

        const result =
            await this.invoiceRepository.findAll(
                filters,
                trx
            );


        //--------------------------------------------------
        // Normalize repository response
        //--------------------------------------------------

        return {

            items:
                result.items ?? [],

            pagination: {

                page:
                    normalizedPage,

                limit:
                    normalizedLimit,

                total:
                    result.total ?? 0,

                totalPages:
                    result.totalPages ??
                    Math.ceil(
                        (result.total ?? 0) /
                        normalizedLimit
                    ),

            },

        };

    }

}