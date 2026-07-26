/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // Shared updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 1. Create Refunds Table
  await knex.schema.createTable('refunds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Financial Tracking (Minor Units)
    table.uuid('payment_id').notNullable().references('id').inTable('payments').onDelete('RESTRICT');
    table.bigInteger('amount_kobo').notNullable();
    table.string('currency', 3).notNullable().defaultTo('NGN');

    // Conference Domain References
    table.uuid('registration_id').notNullable().references('id').inTable('registrations').onDelete('RESTRICT');
    table.uuid('ticket_id').notNullable().references('id').inTable('tickets').onDelete('RESTRICT');
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('RESTRICT');
    table.uuid('attendee_id').notNullable(); // Relates to user/attendee entity

    // Context & Audit Metadata
    table.string('reason_category', 50).notNullable().defaultTo('CUSTOMER_REQUEST');
    table.text('reason').nullable();
    table.uuid('processed_by_user_id').nullable(); // Pathologist / Admin who approved

    // State Machine & Gateway Reference
    table.text('status').notNullable().defaultTo('pending');
    table.text('gateway_refund_id').nullable();
    table.string('gateway_provider', 32).nullable(); // e.g. 'PAYSTACK', 'FLUTTERWAVE', 'STRIPE'
    table.text('error_message').nullable();

    // Idempotency & Metadata
    table.text('idempotency_key').notNullable();
    table.jsonb('metadata').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));

    // Audit Timestamps
    table.timestamp('processed_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // 2. Enforce Invariants & Constraints
  await knex.raw(`
    ALTER TABLE refunds
      ADD CONSTRAINT chk_refunds_amount_kobo CHECK (amount_kobo > 0),
      ADD CONSTRAINT chk_refunds_currency CHECK (char_length(currency) = 3),
      ADD CONSTRAINT chk_refunds_reason_category CHECK (
        reason_category IN (
          'DUPLICATE_CHARGE',
          'FRAUDULENT',
          'CUSTOMER_REQUEST',
          'SERVICE_DISRUPTION',
          'SYSTEM_ERROR',
          'SCHEDULE_CONFLICT',
          'EVENT_CANCELLED',
          'OTHER'
        )
      ),
      ADD CONSTRAINT chk_refunds_status CHECK (
        status IN ('pending', 'processing', 'succeeded', 'failed', 'rejected')
      );
  `);

  // 3. Hardened Query & Integrity Indexes
  await knex.raw(`
    -- Uniqueness: Scope idempotency globally per payment to prevent cross-attendee edge cases
    CREATE UNIQUE INDEX uq_refunds_payment_idempotency
    ON refunds (payment_id, idempotency_key);

    -- Partial Refund Lock Guard: If strictly 1 refund allowed per ticket (Full Refund model)
    CREATE UNIQUE INDEX uq_refunds_active_ticket
    ON refunds (ticket_id)
    WHERE status IN ('pending', 'processing', 'succeeded');

    -- Foreign Key Performance Coverage (Prevents lock contention on parent table updates)
    CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
    CREATE INDEX idx_refunds_ticket_id ON refunds(ticket_id);
    CREATE INDEX idx_refunds_registration_id ON refunds(registration_id);
    CREATE INDEX idx_refunds_attendee_id ON refunds(attendee_id);
    CREATE INDEX idx_refunds_event_id ON refunds(event_id);

    -- Gateway Webhook Reconciliation (Fast lookup when Paystack/Stripe emits refund.updated)
    CREATE UNIQUE INDEX uq_refunds_gateway_refund_id
    ON refunds (gateway_refund_id)
    WHERE gateway_refund_id IS NOT NULL;

    -- Operational Dashboard Index (Pending/Processing queues)
    CREATE INDEX idx_refunds_active_queue
    ON refunds (event_id, status, created_at DESC)
    WHERE status IN ('pending', 'processing');
  `);

  // 4. Attach Updated Timestamp Trigger
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;
    CREATE TRIGGER update_refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;`);
  await knex.schema.dropTableIfExists('refunds');
  // Note: We deliberately preserve update_updated_at_column() as it may be shared across tables.
}