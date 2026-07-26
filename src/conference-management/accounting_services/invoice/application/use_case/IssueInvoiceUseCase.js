// application/use-cases/IssueInvoiceUseCase.js

export class InvoiceNotFoundError extends Error {
  constructor(invoiceId) {
    super(`Invoice with ID "${invoiceId}" was not found.`);
    this.name = 'InvoiceNotFoundError';
    this.statusCode = 404;
  }
}

export class IssueInvoiceUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../ports/InvoiceRepository.js').InvoiceRepository} dependencies.invoiceRepository
   * @param {object} dependencies.transactionManager
   */
  constructor({ invoiceRepository, transactionManager }) {
    this.invoiceRepository = invoiceRepository;
    this.transactionManager = transactionManager;
  }

  /**
   * Transition an invoice from DRAFT to ISSUED status.
   * 
   * @param {Object} input
   * @param {string} input.invoiceId
   * @param {string} [input.issuedBy] - ID/Email of the actor performing the action
   * @param {string} [input.correlationId] - Tracing ID across services
   */
  async execute({ invoiceId, issuedBy = null, correlationId = null }) {
    return await this.transactionManager.run(async (trx) => {
      // 1. Fetch domain aggregate root inside transaction handle
      const invoice = await this.invoiceRepository.findById(invoiceId, trx);

      if (!invoice) {
        throw new InvoiceNotFoundError(invoiceId);
      }

      // 2. Delegate state transition rule enforcement to the Domain Aggregate
      // (The entity method checks if status is DRAFT before transitioning to ISSUED)
      invoice.issue({ issuedBy });

      // 3. Register Outbox Event for async side-effects (PDF generation, email notification)
      invoice.addDomainEvent({
        type: 'INVOICE_ISSUED',
        correlationId,
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientEmail: invoice.clientEmail,
          totalAmountDue: invoice.totalAmountDue,
          dueDate: invoice.dueDate,
          issuedAt: new Date().toISOString(),
          issuedBy,
        },
      });

      // 4. Persist updated aggregate state and save outbox event atomically
      return await this.invoiceRepository.update(invoice, trx);
    });
  }
}