/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Add Domain Check Constraints
  await knex.raw(`
    ALTER TABLE ledger_entries
      ADD CONSTRAINT chk_ledger_entries_amount_positive 
        CHECK (amount_minor > 0),
      ADD CONSTRAINT chk_ledger_entries_currency_format 
        CHECK (currency ~ '^[A-Z]{3}$');
  `);

  // 2. Add Indexes (IF NOT EXISTS for safety)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created
    ON ledger_entries (account_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ledger_entries_journal_lookup
    ON ledger_entries (journal_id);
  `);

  // 3. Idempotency should be enforced on journals, not entries
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_journals_idempotency
    ON ledger_journals (idempotency_key);
  `);
}

export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_ledger_journals_idempotency;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_ledger_entries_journal_lookup;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_ledger_entries_account_created;`);
  await knex.raw(`
    ALTER TABLE ledger_entries
      DROP CONSTRAINT IF EXISTS chk_ledger_entries_amount_positive,
      DROP CONSTRAINT IF EXISTS chk_ledger_entries_currency_format;
  `);
}