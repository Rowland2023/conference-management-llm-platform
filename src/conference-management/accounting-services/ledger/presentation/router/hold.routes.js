/**
 * @file src/conference-management/accounting-services/ledger/presentation/router/journal.routes.js
 *
 * Routes for ledger journal entry operations (posting double-entry transactions,
 * reversing posted entries, and fetching specific entry details).
 */

import express from "express";

import { validate } from "../../../../../shared/infrastructure/middleware/validate.js";
import { authGuard } from "../../../../../shared/infrastructure/middleware/authGuard.js";

import {
  postJournalEntrySchema,
  reverseJournalEntrySchema,
  getJournalEntrySchema,
} from "../validators/journal.validator.js";

/**
 * Creates and configures the Express router for journal entry management.
 *
 * @param {import("../controllers/journal.controller.js").default} journalController
 * @returns {import("express").Router}
 */
export default function createJournalRoutes(journalController) {
  const router = express.Router();

  /**
   * Authentication boundary.
   * Sets req.actor from authenticated request context.
   */
  router.use(authGuard);

  /**
   * POST /journal-entries
   *
   * Creates a balanced double-entry journal transaction.
   *
   * Validation:
   * - idempotency key
   * - journal lines
   * - currency consistency
   * - debit === credit invariant
   */
  router.post(
    "/",
    validate(postJournalEntrySchema),
    journalController.postEntry
  );

  /**
   * POST /journal-entries/:id/reverse
   *
   * Creates an atomic reversal entry for an existing posted journal entry.
   */
  router.post(
    "/:id/reverse",
    validate(reverseJournalEntrySchema),
    journalController.reverseEntry
  );

  /**
   * GET /journal-entries/:id
   *
   * Retrieves journal entry details including debit/credit lines.
   */
  router.get(
    "/:id",
    validate(getJournalEntrySchema),
    journalController.getEntry
  );

  return router;
}