// settlement/presentation/validators/ScheduleSettlementValidator.js

import { z } from "zod";

export const ScheduleSettlementValidator = z.object({

    scheduledAt: z
        .coerce
        .date(),

});