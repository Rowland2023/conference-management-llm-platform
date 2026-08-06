// tax/presentation/validators/TaxIdValidator.js

import { z }
    from "zod";

export const taxIdSchema =

    z.object({

        taxId:

            z.string()

                .uuid(),

    });