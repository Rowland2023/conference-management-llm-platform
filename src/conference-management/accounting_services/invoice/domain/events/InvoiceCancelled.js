// domain/events/InvoiceCancelled.js

export class InvoiceCancelled {
  /**
   * @param {Object} params
   * @param {string} params.invoiceId
   * @param {string} params.invoiceNumber
   * @param {string} params.clientEmail
   * @param {string} params.reason
   * @param {string|number} params.unpaidBalance
   * @param {string} [params.currency='NGN']
   * @param {string} [params.cancelledBy]
   * @param {string} [params.correlationId]
   * @param {Date} [params.occurredOn]
   */
  constructor({
    invoiceId,
    invoiceNumber,
    clientEmail,
    reason,
    unpaidBalance,
    currency = 'NGN',
    cancelledBy = null,
    correlationId = null,
    occurredOn = new Date(),
  }) {
    if (!invoiceId) {
      throw new Error('InvoiceCancelled event requires an invoiceId.');
    }

    if (!reason || !String(reason).trim()) {
      throw new Error('InvoiceCancelled event requires a cancellation reason.');
    }

    this.eventName = 'INVOICE_CANCELLED';
    this.eventId = crypto.randomUUID();
    this.invoiceId = String(invoiceId);
    this.invoiceNumber = String(invoiceNumber);
    this.clientEmail = String(clientEmail);
    this.reason = String(reason).trim();
    
    this.unpaidBalance = typeof unpaidBalance === 'object' && unpaidBalance.toFixed 
      ? unpaidBalance.toFixed() 
      : String(unpaidBalance);
      
    this.currency = String(currency).toUpperCase();
    this.cancelledBy = cancelledBy;
    this.correlationId = correlationId;
    this.occurredOn = occurredOn instanceof Date ? occurredOn : new Date(occurredOn);

    Object.freeze(this);
  }

  /**
   * Serializes event into standard Outbox / Message Broker payload format
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
        reason: this.reason,
        unpaidBalance: this.unpaidBalance,
        currency: this.currency,
        cancelledBy: this.cancelledBy,
      },
    };
  }
}