// application/use-cases/RecordPaymentUseCase.js

export class InvoiceNotFoundError extends Error {
  constructor(invoiceId) {
    super(`Invoice with ID "${invoiceId}" was not found.`);
    this.name = 'InvoiceNotFoundError';
    this.statusCode = 404;
  }
}

export class RecordPaymentUseCase {
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
   * Record a full or partial payment against an issued invoice.
   *
   * @param {Object} input
   * @param {string} input.invoiceId
   * @param {number|string} input.amount
   * @param {string} [input.reference] - External transaction reference or payment intent ID
   * @param {string} [input.paymentMethod] - e.g., 'CARD', 'BANK_TRANSFER', 'USSD'
   * @param {string} [input.correlationId] - Distributed trace ID
   */
  async execute({ invoiceId, amount, reference = null, paymentMethod = 'CARD', correlationId = null }) {
    if (!amount || Number(amount) <= 0) {
      const error = new Error('Payment amount must be greater than zero.');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    return await this.transactionManager.run(async (trx) => {
      // 1. Fetch aggregate root within transaction boundary
      const invoice = await this.invoiceRepository.findById(invoiceId, trx);

      if (!invoice) {
        throw new InvoiceNotFoundError(invoiceId);
      }

      // 2. Delegate financial reconciliation and idempotency checks to Domain Aggregate
      const paymentRecord = invoice.recordPayment({
        amount,
        reference,
        paymentMethod,
      });

      // 3. Register appropriate Outbox Event based on resulting state
      const eventType = invoice.status === 'PAID' ? 'INVOICE_FULLY_PAID' : 'INVOICE_PARTIALLY_PAID';

      invoice.addDomainEvent({
        type: eventType,
        correlationId,
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientEmail: invoice.clientEmail,
          amountPaid: paymentRecord.amount,
          reference: paymentRecord.reference,
          totalAmountDue: invoice.totalAmountDue,
          remainingBalance: invoice.remainingBalance,
          status: invoice.status,
          paidAt: paymentRecord.paidAt,
        },
      });

      // 4. Persist updated aggregate state, payment history, and outbox event
      return await this.invoiceRepository.update(invoice, trx);
    });
  }
}