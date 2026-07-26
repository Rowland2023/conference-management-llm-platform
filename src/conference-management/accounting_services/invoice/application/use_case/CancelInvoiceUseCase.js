// application/use-cases/CancelInvoiceUseCase.js

export class InvoiceNotFoundError extends Error {
  constructor(invoiceId) {
    super(`Invoice with ID "${invoiceId}" was not found.`);
    this.name = 'InvoiceNotFoundError';
    this.statusCode = 404;
  }
}

export class CancelInvoiceUseCase {
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
   * Cancel an existing invoice with a required audit reason.
   * 
   * @param {Object} input
   * @param {string} input.invoiceId
   * @param {string} input.reason - Audit reason for cancellation
   * @param {string} [input.cancelledBy] - ID or email of user executing cancellation
   * @param {string} [input.correlationId] - Distributed tracing ID
   */
  async execute({ invoiceId, reason, cancelledBy = null, correlationId = null }) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      const error = new Error('A valid cancellation reason must be provided.');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    return await this.transactionManager.run(async (trx) => {
      // 1. Fetch aggregate root within active transaction
      const invoice = await this.invoiceRepository.findById(invoiceId, trx);

      if (!invoice) {
        throw new InvoiceNotFoundError(invoiceId);
      }

      // 2. Delegate state transition rules to domain entity
      invoice.cancel(reason.trim(), { cancelledBy });

      // 3. Register Outbox Event for async side effects (e.g., invalidate payment links)
      invoice.addDomainEvent({
        type: 'INVOICE_CANCELLED',
        correlationId,
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientEmail: invoice.clientEmail,
          reason: invoice.cancellationReason,
          cancelledAt: invoice.cancelledAt,
          cancelledBy,
        },
      });

      // 4. Persist aggregate state change and outbox events atomically
      return await this.invoiceRepository.update(invoice, trx);
    });
  }
}