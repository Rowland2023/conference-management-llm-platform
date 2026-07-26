/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Create or replace the PL/pgSQL validation function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION ledger_validate_journal()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_journal_id UUID;
        v_entry_count INTEGER;
        v_balance NUMERIC(20,0);
    BEGIN
        -- Grab journal_id from either NEW (Insert/Update) or OLD (Delete)
        v_journal_id := COALESCE(NEW.journal_id, OLD.journal_id);

        -- Calculate total entries and net balance for the journal
        SELECT
            COUNT(*),
            COALESCE(
                SUM(
                    CASE
                        WHEN entry_type = 'DEBIT' THEN amount_minor
                        ELSE -amount_minor
                    END
                ),
                0
            )
        INTO
            v_entry_count,
            v_balance
        FROM ledger_entries
        WHERE journal_id = v_journal_id;

        -- Allow full batch deletions without triggering a false "out of balance" error
        IF v_entry_count = 0 THEN
            RETURN NULL;
        END IF;

        -- Enforce double-entry accounting rule: At least 2 entries per journal
        IF v_entry_count < 2 THEN
            RAISE EXCEPTION
                'Journal % must contain at least two entries.',
                v_journal_id;
        END IF;

        -- Enforce double-entry accounting rule: Sum of Debits - Sum of Credits = 0
        IF v_balance <> 0 THEN
            RAISE EXCEPTION
                'Journal % is out of balance by %.',
                v_journal_id,
                v_balance;
        END IF;

        RETURN NULL;
    END;
    $$;
  `);

  // 2. Attach as a Deferred Constraint Trigger to allow multi-row inserts in a single transaction
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_ledger_validate_journal ON ledger_entries;

    CREATE CONSTRAINT TRIGGER trg_ledger_validate_journal
    AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION ledger_validate_journal();
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // 1. Drop trigger first to release dependency on the function
  await knex.raw(`DROP TRIGGER IF EXISTS trg_ledger_validate_journal ON ledger_entries;`);

  // 2. Drop the PL/pgSQL function
  await knex.raw(`DROP FUNCTION IF EXISTS ledger_validate_journal();`);
}