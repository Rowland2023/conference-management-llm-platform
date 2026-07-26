/**
 * 2. Ledger Accounts
 *
 * Chart of Accounts.
 *
 * Accounts are immutable in type after creation.
 */
await knex.schema.createTable('ledger_accounts', (table) => {
  /*
   * Identity
   */
  table
    .uuid('id')
    .primary()
    .defaultTo(knex.raw('gen_random_uuid()'));

  /*
   * Tenant boundary
   */
  table
    .uuid('tenant_id')
    .notNullable();

  /*
   * Account code
   *
   * Example:
   * 1000_CASH
   * 4000_REVENUE
   */
  table
    .string('code', 64)
    .notNullable();

  table
    .string('name', 255)
    .notNullable();

  table
    .specificType('type', 'ledger_account_type')
    .notNullable();

  /*
   * Currency
   */
  table
    .string('currency', 3)
    .notNullable();

  /*
   * Status
   */
  table
    .boolean('is_active')
    .notNullable()
    .defaultTo(true);

  /*
   * Audit
   */
  table
    .timestamp('created_at', { useTz: true })
    .notNullable()
    .defaultTo(knex.fn.now());

  table
    .timestamp('updated_at', { useTz: true })
    .notNullable()
    .defaultTo(knex.fn.now());

  /*
   * Constraints
   */

  // Account codes are unique within a tenant
  table.unique(
    ['tenant_id', 'code'],
    'uq_account_code'
  );

  /*
   * Indexes
   */

  table.index(
    ['tenant_id', 'type'],
    'idx_account_type'
  );

  table.index(
    ['tenant_id', 'currency'],
    'idx_account_currency'
  );

  table.index(
    ['tenant_id', 'is_active'],
    'idx_account_active'
  );
});

/*
 * Required for composite FK:
 *
 * FOREIGN KEY (tenant_id, account_id)
 * REFERENCES ledger_accounts (tenant_id,id)
 */
await knex.raw(`
ALTER TABLE ledger_accounts
ADD CONSTRAINT uq_account_tenant
UNIQUE (tenant_id, id);
`);