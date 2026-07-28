/**
 * @file src/presentation/validators/hold.validator.js
 *
 * HTTP Request Validation Schemas for Balance Holds and Reservations.
 */

import { z } from "zod";

/**
 * Validates placing a hold (reservation) on account funds.
 */
export const holdFundsSchema = z.object({
  body: z.object({
    idempotencyKey: z
      .string({ required_error: "idempotencyKey is required" })
      .trim()
      .min(8, "idempotencyKey must be at least 8 characters")
      .max(128, "idempotencyKey cannot exceed 128 characters"),

    accountId: z
      .string({ required_error: "accountId is required" })
      .uuid("accountId must be a valid UUID v4"),

    amount: z
      .string({ required_error: "amount is required" })
      .trim()
      .regex(
        /^[1-9]\d*$/,
        "Amount must be a positive integer string in minor units (e.g., 500 for $5.00)"
      ),

    currency: z
      .string({ required_error: "currency is required" })
      .trim()
      .length(3, "Currency must be a 3-letter ISO 4217 code")
      .regex(/^[A-Za-z]{3}$/, "Currency code must contain only letters")
      .transform((value) => value.toUpperCase()),

    reason: z
      .string({ required_error: "Reason for hold is required" })
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(255, "Reason cannot exceed 255 characters"),

    expiresInSeconds: z
      .number({
        invalid_type_error: "expiresInSeconds must be a number",
      })
      .int("expiresInSeconds must be an integer")
      .positive("expiresInSeconds must be positive")
      .max(
        2592000,
        "Hold duration cannot exceed 30 days (2,592,000 seconds)"
      )
      .optional(),
  }),
});

/**
 * Validates releasing an active hold before its expiration.
 */
export const releaseHoldSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Hold ID. Must be a valid UUID v4"),
  }),

  body: z
    .object({
      idempotencyKey: z
        .string({ required_error: "idempotencyKey is required" })
        .trim()
        .min(8)
        .max(128),

      reason: z
        .string()
        .trim()
        .min(3, "Release reason must be at least 3 characters")
        .max(255)
        .optional(),
    })
    .default({}),
});