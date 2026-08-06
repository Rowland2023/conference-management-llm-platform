// settlement/presentation/validators/CancelSettlementValidator.js

import { z } from "zod";

export const CancelSettlementValidator = z.object({

    reason: z
        .string()
        .min(3)
        .max(255),

});