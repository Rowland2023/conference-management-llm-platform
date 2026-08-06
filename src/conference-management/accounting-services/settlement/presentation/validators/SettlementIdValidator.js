// settlement/presentation/validators/SettlementIdValidator.js

import { z } from "zod";

export const SettlementIdValidator = z.object({

    settlementId: z
        .string()
        .uuid(),

});