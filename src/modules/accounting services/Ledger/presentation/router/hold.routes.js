/**
 * @file src/presentation/routes/journal.routes.js
 * 
 * Routes for ledger journal entry operations (posting double-entry transactions, 
 * reversing posted entries, and fetching specific entry details).
 */
const express = require('express');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const {
  postJournalEntrySchema,
  reverseJournalEntrySchema,
  getJournalEntrySchema,
} = require('../validators/journal.validator');

/**
 * Creates and configures the Express router for journal entry management.
 * 
 * @param {import('../controllers/journal.controller')} journalController 
 * @returns {express.Router}
 */
function createJournalRoutes(journalController) {
  const router = express.Router();

  // Enforce authentication context (req.actor) across all journal routes
  router.use(authenticate);

  /**
   * POST /journal-entries
   * Posts a new balanced double-entry transaction.
   */
  router.post(
    '/',
    validate(postJournalEntrySchema),
    journalController.postEntry
  );

  /**
   * POST /journal-entries/:id/reverse
   * Reverses an existing posted journal entry atomically.
   */
  router.post(
    '/:id/reverse',
    validate(reverseJournalEntrySchema),
    journalController.reverseEntry
  );

  /**
   * GET /journal-entries/:id
   * Fetches journal entry details and underlying debit/credit lines.
   */
  router.get(
    '/:id',
    validate(getJournalEntrySchema),
    journalController.getEntry
  );

  return router;
}

module.exports = createJournalRoutes;