/**
 * 4. Ledger Entries
 *
 * Immutable debit/credit postings.
 * Every row represents exactly one side of an accounting transaction.
 */
await knex.schema.createTable('ledger_entries', (table) => {
  table
    .uuid('id')
    .primary()
    .defaultTo(knex.raw('gen_random_uuid()'));

  /*
   * Multi-tenant boundary
   */
  table
    .uuid('tenant_id')
    .notNullable();

  /*
   * Parent journal
   */
  table
    .uuid('journal_id')
    .notNullable();

  table
    .foreign('journal_id')
    .references('id')
    .inTable('ledger_journals')
    .onDelete('RESTRICT');

  /*
   * Ledger account
   */
  table
    .uuid('account_id')
    .notNullable();

  table
    .foreign('account_id')
    .references('id')
    .inTable('ledger_accounts')
    .onDelete('RESTRICT');

  /*
   * Debit / Credit
   */
  table
    .specificType('entry_type', 'ledger_entry_type')
    .notNullable();

  /*
   * Always positive.
   * Direction comes from entry_type.
   */
  table
    .bigInteger('amount_minor')
    .notNullable();

  /*
   * Currency
   */
  table
    .string('currency', 3)
    .notNullable();

  /*
   * Position inside journal.
   *
   * Useful for displaying entries
   * exactly as posted.
   */
  table
    .smallint('line_number')
    .notNullable();

  /*
   * Optional business metadata.
   */
  table
    .jsonb('metadata')
    .notNullable()
    .defaultTo('{}');

  /*
   * Audit timestamp.
   */
  table
    .timestamp('created_at', { useTz: true })
    .notNullable()
    .defaultTo(knex.fn.now());

  /*
   * Constraints
   */

  table.check('amount_minor > 0');

  table.unique(
    ['journal_id', 'line_number'],
    'uq_entry_line_number'
  );

  /*
   * Indexes
   */

  table.index(
    ['tenant_id', 'journal_id'],
    'idx_entries_journal'
  );

  table.index(
    ['tenant_id', 'account_id'],
    'idx_entries_account'
  );

  table.index(
    ['tenant_id', 'account_id', 'created_at'],
    'idx_entries_account_created'
  );

  table.index(
    ['tenant_id', 'currency'],
    'idx_entries_currency'
  );
});