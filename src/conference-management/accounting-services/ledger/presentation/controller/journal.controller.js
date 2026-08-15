/**
 * @file src/presentation/controllers/journal.controller.js
 *
 * Journal Entry HTTP Controller.
 *
 * Thin HTTP adapter.
 * Delegates all application operations to LedgerService.
 */



export default class JournalController {

  constructor({
    ledgerService,
  }) {
    this.ledgerService = ledgerService;
  }


  /**
   * POST /journal-entries
   */
  postEntry = async (req, res, next) => {
    try {

      const {
        actor,
        body = {},
      } = req;


      const idempotencyKey =
        req.headers["idempotency-key"] ||
        body.idempotencyKey;


      const entry =
        await this.ledgerService.postJournalEntry({

          ...body,

          tenantId: actor.tenantId,

          actor,

          idempotencyKey,

          correlationId: req.correlationId,

        });


      return res.status(201).json(entry);


    } catch (err) {

      next(err);

    }
  };



  /**
   * POST /journal-entries/:id/reverse
   */
  reverseEntry = async (req, res, next) => {
    try {

      const {
        actor,
        body = {},
      } = req;


      const idempotencyKey =
        req.headers["idempotency-key"] ||
        body.idempotencyKey;


      const entry =
        await this.ledgerService.reverseJournalEntry({

          id: req.params.id,

          tenantId: actor.tenantId,

          actor,

          reason: body.reason,

          idempotencyKey,

          correlationId: req.correlationId,

        });


      return res.status(200).json(entry);


    } catch(err) {

      next(err);

    }
  };

}