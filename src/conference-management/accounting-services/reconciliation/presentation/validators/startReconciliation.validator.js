import { z } from "zod";

export const startReconciliationSchema = z.object({

    type: z.enum([

        "DAILY",
        "MANUAL",
        "MONTH_END",

    ])

});