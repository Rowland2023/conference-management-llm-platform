import BigNumber from "bignumber.js";

//--------------------------------------------------
// Financial rounding
//--------------------------------------------------

const BN = BigNumber.clone({

    ROUNDING_MODE:
        BigNumber.ROUND_HALF_UP,

});

export class InvoicePricingService {

    calculate({

        items = [],

        taxRatePercent = 7.50,

        depositPaid = 0.00,

    }) {

        let subtotal =
            new BN(0);


        //--------------------------------------------------
        // Line Items
        //--------------------------------------------------

        const lineItems =
            items.map((item) => {

                const quantity =
                    new BN(item.quantity || 0);

                const unitPrice =
                    new BN(item.unitPrice || 0);

                const lineTotal =
                    new BN(

                        quantity
                            .multipliedBy(unitPrice)
                            .toFixed(2)

                    );

                subtotal =
                    subtotal.plus(lineTotal);

                return {

                    ...item,

                    quantity:
                        quantity.toNumber(),

                    unitPrice:
                        unitPrice.toFixed(2),

                    totalPrice:
                        lineTotal.toFixed(2),

                    totalPriceMinor:
                        lineTotal
                            .multipliedBy(100)
                            .toNumber(),

                };

            });


        //--------------------------------------------------
        // Tax
        //--------------------------------------------------

        const taxRate =
            new BN(taxRatePercent)
                .dividedBy(100);

        const taxAmount =
            new BN(

                subtotal
                    .multipliedBy(taxRate)
                    .toFixed(2)

            );


        //--------------------------------------------------
        // Gross
        //--------------------------------------------------

        const grossTotal =
            subtotal.plus(taxAmount);


        //--------------------------------------------------
        // Deposit
        //--------------------------------------------------

        const deposit =
            new BN(

                new BN(depositPaid)
                    .toFixed(2)

            );


        //--------------------------------------------------
        // Amount Due
        //--------------------------------------------------

        const totalAmountDue =
            BN.max(

                0,

                grossTotal.minus(deposit)

            );


        //--------------------------------------------------
        // Result
        //--------------------------------------------------

        return {

            lineItems,

            subtotal:
                subtotal.toFixed(2),

            taxAmount:
                taxAmount.toFixed(2),

            grossTotal:
                grossTotal.toFixed(2),

            depositPaid:
                deposit.toFixed(2),

            totalAmountDue:
                totalAmountDue.toFixed(2),

            subtotalMinor:
                subtotal
                    .multipliedBy(100)
                    .toNumber(),

            taxAmountMinor:
                taxAmount
                    .multipliedBy(100)
                    .toNumber(),

            grossTotalMinor:
                grossTotal
                    .multipliedBy(100)
                    .toNumber(),

            totalAmountDueMinor:
                totalAmountDue
                    .multipliedBy(100)
                    .toNumber(),

        };

    }

}