-- 1. Create enum for strict outbox status lifecycle
CREATE TYPE outbox_event_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'DEAD_LETTER'
);

-- 2. Hardened Outbox Events Table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status outbox_event_status NOT NULL DEFAULT 'PENDING',
    
    -- Retry & Backoff Mechanics
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,

    -- Traceability Context
    correlation_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

-- 3. High-Performance Partial Index for Publisher Polling (SKIP LOCKED Optimization)
-- Only indexes active/pending events, maintaining lightning-fast B-Tree size regardless of total table history.
CREATE INDEX idx_outbox_events_unprocessed_polling 
ON outbox_events (next_retry_at ASC, created_at ASC) 
WHERE status IN ('PENDING', 'PROCESSING');

-- 4. Supplemental Lookup Index for Aggregate Audit Trails
CREATE INDEX idx_outbox_events_aggregate 
ON outbox_events (aggregate_type, aggregate_id);

-- -----------------------------------------------------------------------------
-- Example Initial Partition Setup (Monthly or Daily depending on volume)
-- -----------------------------------------------------------------------------
CREATE TABLE outbox_events_y2026m07 PARTITION OF outbox_events
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE outbox_events_y2026m08 PARTITION OF outbox_events
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');