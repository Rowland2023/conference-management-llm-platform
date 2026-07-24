/**
 * @file src/presentation/controllers/journal.controller.js
 * 
 * Journal Entry HTTP Controller for posting, reversing, and querying ledger entries.
 */
const JournalSerializer = require('../serializers/journal.serializer');

class JournalController {
  constructor({ postJournalEntryUseCase, reverseJournalEntryUseCase, getJournalEntryUseCase }) {
    this.postJournalEntryUseCase = postJournalEntryUseCase;
    this.reverseJournalEntryUseCase = reverseJournalEntryUseCase;
    this.getJournalEntryUseCase = getJournalEntryUseCase;
  }

  /**
   * Handles HTTP POST /journal-entries
   */
  postEntry = async (req, res, next) => {
    try {
      // Support Idempotency-Key header with fallback to body property
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

      const entry = await this.postJournalEntryUseCase.execute({
        ...req.body,
        idempotencyKey,
        tenantId: req.actor.tenantId,
        actor: req.actor,
      });

      return res.status(201).json({
        success: true,
        data: JournalSerializer.serialize(entry),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles HTTP POST /journal-entries/:id/reverse
   */
  reverseEntry = async (req, res, next) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

      const entry = await this.reverseJournalEntryUseCase.execute({
        id: req.params.id,
        tenantId: req.actor.tenantId, // Scoped to tenant
        idempotencyKey,
        reason: req.body.reason,
        actor: req.actor,
      });

      return res.status(200).json({
        success: true,
        data: JournalSerializer.serialize(entry),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles HTTP GET /journal-entries/:id
   */
  getEntry = async (req, res, next) => {
    try {
      const entry = await this.getJournalEntryUseCase.execute({
        id: req.params.id,
        tenantId: req.actor.tenantId, // Prevent cross-tenant entry lookup
      });

      return res.status(200).json({
        success: true,
        data: JournalSerializer.serialize(entry),
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = JournalController;