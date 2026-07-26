// application/services/InvoiceCalculator.js
import BigNumber from 'bignumber.js';

// Enforce standard financial rounding (Half-Up)
const BN = BigNumber.clone({ ROUNDING_MODE: BigNumber.ROUND_HALF_UP });

export class InvoiceCalculator {
  /**
   * Computes individual line totals and aggregated invoice financial totals.
   * Ensures subtotal strictly equals the sum of displayed line item totals.
   *
   * @param {Array<{quantity: number|string, unitPrice: number|string}>} items
   * @param {number|string} [taxRatePercent=7.5] e.g. 7.5
   * @param {number|string} [depositPaid=0] e.g. 1000.00
   * @returns {{
   *   lineItems: Array<{quantity: number, unitPrice: string, totalPrice: string, totalPriceMinor: number}>,
   *   subtotal: string,
   *   taxAmount: string,
   *   grossTotal: string,
   *   depositPaid: string,
   *   totalAmountDue: string,
   *   subtotalMinor: number,
   *   taxAmountMinor: number,
   *   grossTotalMinor: number,
   *   totalAmountDueMinor: number
   * }}
   */
  static calculateTotals(items = [], taxRatePercent = 7.50, depositPaid = 0.00) {
    let subtotal = new BN(0);

    // 1. Calculate each line item with exact 2-decimal rounding
    const lineItems = items.map((item) => {
      const qty = new BN(item.quantity || 0);
      const price = new BN(item.unitPrice || 0);
      const rawTotal = qty.multipliedBy(price);
      
      // Round line total to 2 decimals immediately to guarantee accounting sum consistency
      const lineTotalFormatted = rawTotal.toFixed(2);
      const lineTotalBN = new BN(lineTotalFormatted);

      subtotal = subtotal.plus(lineTotalBN);

      return {
        ...item,
        quantity: qty.toNumber(),
        unitPrice: price.toFixed(2),
        totalPrice: lineTotalFormatted,
        totalPriceMinor: lineTotalBN.multipliedBy(100).toNumber(),
      };
    });

    // 2. Compute Tax and Totals
    const taxRate = new BN(taxRatePercent || 0).dividedBy(100);
    const taxAmountBN = new BN(subtotal.multipliedBy(taxRate).toFixed(2));
    const grossTotalBN = subtotal.plus(taxAmountBN);

    const depositBN = new BN(new BN(depositPaid || 0).toFixed(2));
    const totalAmountDueBN = BN.max(0, grossTotalBN.minus(depositBN));

    return {
      lineItems,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmountBN.toFixed(2),
      grossTotal: grossTotalBN.toFixed(2),
      depositPaid: depositBN.toFixed(2),
      totalAmountDue: totalAmountDueBN.toFixed(2),

      // Integer Minor Units (Kobo / Cents) for direct double-entry ledger integration
      subtotalMinor: subtotal.multipliedBy(100).toNumber(),
      taxAmountMinor: taxAmountBN.multipliedBy(100).toNumber(),
      grossTotalMinor: grossTotalBN.multipliedBy(100).toNumber(),
      totalAmountDueMinor: totalAmountDueBN.multipliedBy(100).toNumber(),
    };
  }
}