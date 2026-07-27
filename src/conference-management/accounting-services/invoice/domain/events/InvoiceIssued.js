// domain/events/InvoiceIssued.js

export class InvoiceIssued {
  /**
   * @param {Object} params
   * @param {string} params.invoiceId
   * @param {string} params.invoiceNumber
   * @param {string} params.clientEmail
   * @param {string|number} params.totalAmountDue
   * @param {string} [params.currency='NGN']
   * @param {string} [params.issuedBy]
   * @param {string} [params.correlationId]
   * @param {Date} [params.occurredOn]
   */
  constructor({
    invoiceId,
    invoiceNumber,
    clientEmail,
    totalAmountDue,
    currency = 'NGN',
    issuedBy = null,
    correlationId = null,
    occurredOn = new Date(),
  }) {
    if (!invoiceId) {
      throw new Error('InvoiceIssued event requires an invoiceId.');
    }

    this.eventName = 'INVOICE_ISSUED';
    this.eventId = crypto.randomUUID();
    this.invoiceId = String(invoiceId);
    this.invoiceNumber = String(invoiceNumber);
    this.clientEmail = clientEmail;
    this.totalAmountDue = typeof totalAmountDue === 'object' && totalAmountDue.toFixed 
      ? totalAmountDue.toFixed() 
      : String(totalAmountDue);
    this.currency = String(currency).toUpperCase();
    this.issuedBy = issuedBy;
    this.correlationId = correlationId;
    this.occurredOn = occurredOn instanceof Date ? occurredOn : new Date(occurredOn);

    Object.freeze(this);
  }

  /**
   * Serializes event into standard Outbox payload format
   */
  toJSON() {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      correlationId: this.correlationId,
      payload: {
        invoiceId: this.invoiceId,
        invoiceNumber: this.invoiceNumber,
        clientEmail: this.clientEmail,
        totalAmountDue: this.totalAmountDue,
        currency: this.currency,
        issuedBy: this.issuedBy,
      },
    };
  }
}