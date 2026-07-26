// application/use-cases/CreateInvoiceUseCase.js
import { ConferenceInvoice } from '../../domain/ConferenceInvoice.js';
import { InvoiceLineItem } from '../../domain/InvoiceLineItem.js';

export class CreateInvoiceUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../ports/InvoiceRepository.js').InvoiceRepository} dependencies.invoiceRepository
   * @param {import('../ports/InvoiceNumberGenerator.js').InvoiceNumberGenerator} dependencies.invoiceNumberGenerator
   * @param {object} dependencies.transactionManager
   */
  constructor({ invoiceRepository, invoiceNumberGenerator, transactionManager }) {
    this.invoiceRepository = invoiceRepository;
    this.invoiceNumberGenerator = invoiceNumberGenerator;
    this.transactionManager = transactionManager;
  }

  async execute(dto) {
    return await this.transactionManager.run(async (trx) => {
      // 1. Generate sequential reference number within active transaction context
      const invoiceNumber = await this.invoiceNumberGenerator.generate({ trx });

      // 2. Instantiate Value Objects / Line Item Entities
      const lineItems = dto.items.map(
        (item) =>
          new InvoiceLineItem({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })
      );

      // 3. Construct Aggregate Root (Domain logic/InvoiceCalculator handles financial math internally)
      const invoiceAggregate = ConferenceInvoice.create({
        invoiceNumber,
        conferenceName: dto.conferenceName,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        clientAddress: dto.clientAddress,
        currency: dto.currency || 'NGN',
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        eventStartDate: dto.eventStartDate,
        eventEndDate: dto.eventEndDate,
        taxRate: dto.taxRate,
        depositPaid: dto.depositPaid,
        status: 'DRAFT',
        items: lineItems,
        correlationId: dto.correlationId || null,
      });

      // 4. Record uncommitted domain event for Transactional Outbox Pattern
      invoiceAggregate.addDomainEvent({
        type: 'INVOICE_CREATED',
        correlationId: dto.correlationId || null,
        payload: {
          invoiceId: invoiceAggregate.id,
          invoiceNumber: invoiceAggregate.invoiceNumber,
          clientEmail: invoiceAggregate.clientEmail,
          totalAmountDue: invoiceAggregate.totalAmountDue,
          currency: invoiceAggregate.currency,
        },
      });

      // 5. Persist aggregate and outbox events atomically
      return await this.invoiceRepository.save(invoiceAggregate, trx);
    });
  }
}