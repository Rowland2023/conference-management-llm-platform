/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // 1. Reusable trigger function for updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 2. Create Payments Table
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('order_id').notNullable();

    // Financial Tracking (Minor units - Kobo, Cents)
    table.bigInteger('amount_kobo').notNullable();
    table.string('currency', 3).notNullable();
    table.string('gateway', 20).notNullable();

    // Scoped Idempotency Key (uniqueness scoped below via composite index)
    table.string('idempotency_key', 128).notNullable();

    // State Machine
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('gateway_transaction_id', 255).nullable();
    table.string('gateway_reference', 255).nullable();
    table.jsonb('metadata').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    table.text('error_message').nullable();

    // Audit Timestamps
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true }).nullable();
  });

  // 3. DB-Level Constraints & Checks
  await knex.raw(`
    ALTER TABLE payments
      ADD CONSTRAINT chk_payments_amount CHECK (amount_kobo > 0),
      ADD CONSTRAINT chk_payments_currency CHECK (currency IN ('NGN', 'USD', 'GHS', 'KES')),
      ADD CONSTRAINT chk_payments_gateway CHECK (gateway IN ('paystack', 'flutterwave', 'stripe')),
      ADD CONSTRAINT chk_payments_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
  `);

  // 4. Hardened Index Strategy
  await knex.raw(`
    -- Anti-Double-Payment Guard: Only 1 active (pending/processing) payment allowed per order
    CREATE UNIQUE INDEX uq_payments_active_order
    ON payments (order_id)
    WHERE status IN ('pending', 'processing');

    -- Scoped Idempotency: Prevent collision across different users
    CREATE UNIQUE INDEX uq_payments_user_idempotency
    ON payments (user_id, idempotency_key);

    -- Webhook Reconciliation: Fast lookup when provider sends transaction ID or reference
    CREATE UNIQUE INDEX uq_payments_gateway_transaction_id
    ON payments (gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL;

    CREATE UNIQUE INDEX uq_payments_gateway_reference
    ON payments (gateway_reference)
    WHERE gateway_reference IS NOT NULL;

    -- Dashboard & User Query Paths
    CREATE INDEX idx_payments_user_status ON payments(user_id, status);
    CREATE INDEX idx_payments_order_id ON payments(order_id);
    CREATE INDEX idx_payments_status_created ON payments(status, created_at DESC);
  `);

  // 5. Attach Updated Timestamp Trigger
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
    CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;');
  await knex.schema.dropTableIfExists('payments');
}