// tax/domain/policies/TaxPolicy.js

export class TaxPolicy {

    calculate({

        taxType,

        taxableAmount,

        rate,

    }) {

        if (taxableAmount <= 0) {

            throw new Error(

                "Taxable amount must be greater than zero."

            );

        }

        return {

            taxType,

            taxableAmount,

            taxAmount: taxableAmount * rate,

        };

    }

}