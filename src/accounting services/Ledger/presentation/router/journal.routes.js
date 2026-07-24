const express = require('express');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { idempotency } = require('../middleware/idempotency.middleware'); // you have this
const { correlation } = require('../middleware/correlation.middleware');
const {
  postJournalEntrySchema,
  reverseJournalEntrySchema,
  getJournalEntrySchema,
} = require('../validators/journal.validator');

function createJournalRoutes(journalController) {
  const router = express.Router();

  // Order matters: correlation -> auth -> validation -> controller
  router.use(correlation); 
  router.use(authenticate);

  router.post(
    '/',
    idempotency, // extracts header, ensures required
    validate(postJournalEntrySchema),
    journalController.postEntry
  );

  router.post(
    '/:id/reverse',
    idempotency,
    validate(reverseJournalEntrySchema),
    journalController.reverseEntry
  );

  router.get(
    '/:id',
    validate(getJournalEntrySchema),
    journalController.getEntry
  );

  return router;
}

module.exports = createJournalRoutes;