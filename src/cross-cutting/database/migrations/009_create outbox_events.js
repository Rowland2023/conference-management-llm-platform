/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // 1. Idempotent Custom Enum Type
  await knex.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_event_status') THEN
        CREATE TYPE outbox_event_status AS ENUM (
          'PENDING',
          'PROCESSING',
          'PROCESSED',
          'FAILED',
          'DEAD_LETTER'
        );
      END IF;
    END $$;
  `);

  // 2. Partitioned Parent Table
  // Primary key includes partition key 'created_at' to satisfy PostgreSQL engine constraints
  await knex.raw(`
    CREATE TABLE outbox_events (
      id UUID DEFAULT gen_random_uuid(),
      aggregate_type VARCHAR(100) NOT NULL,
      aggregate_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      status outbox_event_status NOT NULL DEFAULT 'PENDING',
      
      retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
      max_retries INT NOT NULL DEFAULT 5 CHECK (max_retries > 0),
      next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,

      correlation_id UUID,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,

      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
  `);

  // 3. Initial Monthly Range Partitions + Emergency Default Catch-All
  await knex.raw(`
    CREATE TABLE outbox_events_y2026m07 PARTITION OF outbox_events
      FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

    CREATE TABLE outbox_events_y2026m08 PARTITION OF outbox_events
      FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

    CREATE TABLE outbox_events_y2026m09 PARTITION OF outbox_events
      FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

    -- Catch-all partition prevents database write outages if partition creation cron lags
    CREATE TABLE outbox_events_default PARTITION OF outbox_events DEFAULT;
  `);

  // 4. Highly Optimized Worker Polling & Domain Indexes
  await knex.raw(`
    -- Hot Path: Single-status index for SKIP LOCKED worker queries
    -- Keeps index minimal and eliminates index maintenance overhead on status updates
    CREATE INDEX idx_outbox_events_pending_polling
    ON outbox_events (next_retry_at ASC, created_at ASC)
    WHERE status = 'PENDING';

    -- Query Path: Find events for specific domain entity
    CREATE INDEX idx_outbox_events_aggregate
    ON outbox_events (aggregate_type, aggregate_id);

    -- Distributed Tracing / Telemetry Lookup
    CREATE INDEX idx_outbox_events_correlation
    ON outbox_events (correlation_id) 
    WHERE correlation_id IS NOT NULL;

    -- Maintenance / Cleanup Index
    CREATE INDEX idx_outbox_events_status_created
    ON outbox_events (status, created_at);
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // CASCADE automatically drops all attached partitions, trigger functions, and indexes atomically
  await knex.raw(`DROP TABLE IF EXISTS outbox_events CASCADE;`);

  // Drop custom enum type safely
  await knex.raw(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_event_status') THEN
        DROP TYPE outbox_event_status;
      END IF;
    END $$;
  `);
}