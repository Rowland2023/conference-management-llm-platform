import { z } from "zod";

export const resolveDiscrepancySchema = z.object({

    discrepancyId: z.string().uuid(),

});