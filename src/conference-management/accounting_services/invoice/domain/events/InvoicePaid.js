// domain/events/InvoicePaid.js

export class InvoicePaid {
  /**
   * @param {Object} params
   * @param {string} params.invoiceId
   * @param {string} params.invoiceNumber
   * @param {string|number} params.amountPaid
   * @param {string|number} params.remainingBalance
   * @param {boolean} params.isFullyPaid
   * @param {string} [params.reference] - Gateway or transaction reference
   * @param {string} [params.paymentMethod='CARD']
   * @param {string} [params.currency='NGN']
   * @param {string} [params.correlationId]
   * @param {Date} [params.occurredOn]
   */
  constructor({
    invoiceId,
    invoiceNumber,
    amountPaid,
    remainingBalance,
    isFullyPaid,
    reference = null,
    paymentMethod = 'CARD',
    currency = 'NGN',
    correlationId = null,
    occurredOn = new Date(),
  }) {
    if (!invoiceId) {
      throw new Error('InvoicePaid event requires an invoiceId.');
    }

    this.eventId = crypto.randomUUID();
    this.isFullyPaid = Boolean(isFullyPaid);
    this.eventName = this.isFullyPaid ? 'INVOICE_FULLY_PAID' : 'INVOICE_PARTIALLY_PAID';
    
    this.invoiceId = String(invoiceId);
    this.invoiceNumber = String(invoiceNumber);
    this.amountPaid = typeof amountPaid === 'object' && amountPaid.toFixed 
      ? amountPaid.toFixed() 
      : String(amountPaid);
    this.remainingBalance = typeof remainingBalance === 'object' && remainingBalance.toFixed 
      ? remainingBalance.toFixed() 
      : String(remainingBalance);
    
    this.reference = reference;
    this.paymentMethod = paymentMethod;
    this.currency = String(currency).toUpperCase();
    this.correlationId = correlationId;
    this.occurredOn = occurredOn instanceof Date ? occurredOn : new Date(occurredOn);

    Object.freeze(this);
  }

  /**
   * Serializes event into standard Outbox / EventBroker payload format
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
        amountPaid: this.amountPaid,
        remainingBalance: this.remainingBalance,
        isFullyPaid: this.isFullyPaid,
        reference: this.reference,
        paymentMethod: this.paymentMethod,
        currency: this.currency,
      },
    };
  }
}