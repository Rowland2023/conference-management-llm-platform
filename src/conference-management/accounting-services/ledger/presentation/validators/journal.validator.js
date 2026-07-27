/**
 * @file src/presentation/validators/journal.validator.js
 * 
 * HTTP Request Validation Schemas for Double-Entry Journal Operations.
 */
const { z } = require('zod');

// --- Reusable Atomic Schemas ---

const journalLineSchema = z.object({
  accountId: z
    .string({ required_error: 'accountId is required' })
    .uuid('accountId must be a valid UUID v4'),

  amount: z
    .string({ required_error: 'amount is required' })
    .trim()
    .regex(/^[1-9]\d*$/, 'Amount must be a positive integer in minor units (e.g., 1000 for $10.00)'),

  direction: z.enum(['DEBIT', 'CREDIT'], {
    errorMap: () => ({ message: 'Direction must be either DEBIT or CREDIT' }),
  }),

  currency: z
    .string({ required_error: 'currency is required' })
    .trim()
    .length(3, 'Currency must be a 3-letter ISO 4217 code')
    .regex(/^[A-Za-z]{3}$/, 'Currency code must contain only letters')
    .transform((val) => val.toUpperCase()),
});

// --- Endpoint Request Schemas ---

/**
 * Validates posting a new double-entry journal transaction.
 */
const postJournalEntrySchema = z.object({
  body: z.object({
    idempotencyKey: z
      .string({ required_error: 'idempotencyKey is required' })
      .trim()
      .min(8, 'idempotencyKey must be at least 8 characters')
      .max(128, 'idempotencyKey cannot exceed 128 characters'),

    description: z
      .string({ required_error: 'description is required' })
      .trim()
      .min(3, 'Description must be at least 3 characters')
      .max(255, 'Description cannot exceed 255 characters'),

    lines: z
      .array(journalLineSchema)
      .min(2, 'Journal entry must contain at least 2 lines for double-entry balancing'),

    metadata: z.record(z.any()).optional().default({}),
  })
  // Pre-validate double-entry balance equality at the HTTP request edge
  .superRefine((data, ctx) => {
    const { lines } = data;

    // 1. Single currency enforcement per journal transaction
    const currencies = new Set(lines.map((l) => l.currency));
    if (currencies.size > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'All lines within a journal entry must share the same currency',
        path: ['lines'],
      });
    }

    // 2. Strict Double-Entry Balance Check: sum(DEBIT) === sum(CREDIT)
    let totalDebit = 0n;
    let totalCredit = 0n;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const val = BigInt(line.amount);
        if (line.direction === 'DEBIT') {
          totalDebit += val;
        } else if (line.direction === 'CREDIT') {
          totalCredit += val;
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid numeric string format for amount',
          path: ['lines', i, 'amount'],
        });
      }
    }

    if (totalDebit !== totalCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unbalanced journal entry: Total DEBIT (${totalDebit.toString()}) must equal Total CREDIT (${totalCredit.toString()})`,
        path: ['lines'],
      });
    }
  }),
});

/**
 * Validates reversing an existing journal entry.
 */
const reverseJournalEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Journal Entry ID format. Must be a valid UUID v4'),
  }),
  body: z.object({
    idempotencyKey: z
      .string({ required_error: 'idempotencyKey is required' })
      .trim()
      .min(8)
      .max(128),
    reason: z
      .string({ required_error: 'Reversal reason is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(255),
  }),
});

/**
 * Validates fetching a single journal entry by ID.
 */
const getJournalEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Journal Entry ID format. Must be a valid UUID v4'),
  }),
});

module.exports = {
  postJournalEntrySchema,
  reverseJournalEntrySchema,
  getJournalEntrySchema,
};