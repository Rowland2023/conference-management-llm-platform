// settlement/presentation/validators/CreateSettlementValidator.js

import { z } from "zod";

export const CreateSettlementValidator = z.object({

    merchantId: z
        .string()
        .uuid(),

    amount: z
        .number()
        .positive(),

    currency: z
        .string()
        .length(3),

    method: z
        .string()
        .min(1),

});