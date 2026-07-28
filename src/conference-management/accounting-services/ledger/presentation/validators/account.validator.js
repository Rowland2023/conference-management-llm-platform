/**
 * @file ledger/presentation/validators/account.validator.js
 */

import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    code: z
      .string()
      .trim()
      .min(1, "Account code is required"),

    name: z
      .string()
      .trim()
      .min(1, "Account name is required"),

    type: z
      .enum([
        "ASSET",
        "LIABILITY",
        "EQUITY",
        "REVENUE",
        "EXPENSE",
      ]),

    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Za-z]{3}$/)
      .transform((v) => v.toUpperCase()),
  }),
});

export const getAccountBalanceSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid account id"),
  }),
});