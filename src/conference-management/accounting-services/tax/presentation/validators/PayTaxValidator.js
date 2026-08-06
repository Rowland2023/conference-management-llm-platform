// tax/presentation/validators/PayTaxValidator.js

import { z }
    from "zod";

export const payTaxSchema =

    z.object({

        paymentReference:

            z.string()

                .min(1),

        paidAt:

            z.coerce.date()

                .optional(),

    });