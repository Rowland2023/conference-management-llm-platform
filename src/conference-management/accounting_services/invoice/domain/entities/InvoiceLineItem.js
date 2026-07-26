// domain/entities/InvoiceLineItem.js
import { Money } from '../value-objects/Money.js';
import BigNumber from 'bignumber.js';

export class InvoiceLineItem {
  /**
   * @param {Object} params
   * @param {string|null} [params.id]
   * @param {string} params.category - e.g. 'REGISTRATION', 'ADD_ON', 'WORKSHOP'
   * @param {string} params.description
   * @param {number|string|BigNumber} params.quantity
   * @param {Money|number|string} params.unitPrice
   * @param {string} [params.currency='NGN']
   * @param {boolean} [params.allowFractionalQuantity=false]
   */
  constructor({
    id = null,
    category,
    description,
    quantity,
    unitPrice,
    currency = 'NGN',
    allowFractionalQuantity = false,
  }) {
    if (!category || !String(category).trim()) {
      throw new Error('Line item category is required.');
    }

    if (!description || !String(description).trim()) {
      throw new Error('Line item description is required.');
    }

    const qtyBN = new BigNumber(quantity);
    if (qtyBN.isNaN() || qtyBN.isLessThanOrEqualTo(0)) {
      throw new Error(`Line item quantity must be greater than zero. Received: ${quantity}`);
    }

    if (!allowFractionalQuantity && !qtyBN.isInteger()) {
      throw new Error(`Line item quantity must be a whole integer for category "${category}".`);
    }

    this.id = id || crypto.randomUUID();
    this.category = String(category).toUpperCase().trim();
    this.description = String(description).trim();
    this.quantity = qtyBN;
    
    // Ensure unit price is a valid Money VO
    this.unitPrice = unitPrice instanceof Money 
      ? unitPrice 
      : new Money(unitPrice, currency);

    // Pure calculation via Money VO
    this.totalPrice = this.unitPrice.multiply(this.quantity);

    Object.freeze(this);
  }

  get currency() {
    return this.unitPrice.currency;
  }

  /**
   * Serializes line item into plain primitive object for DB/Outbox payload
   */
  toJSON() {
    return {
      id: this.id,
      category: this.category,
      description: this.description,
      quantity: this.quantity.toNumber(),
      unitPrice: this.unitPrice.toFixed(),
      totalPrice: this.totalPrice.toFixed(),
      currency: this.currency,
    };
  }

  static from(data) {
    if (data instanceof InvoiceLineItem) return data;
    return new InvoiceLineItem(data);
  }
}