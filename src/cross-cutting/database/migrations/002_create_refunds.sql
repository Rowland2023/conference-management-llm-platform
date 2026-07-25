-- migrations/002_create_refunds.sql

BEGIN;

-- 1. Create Refunds Table
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Payment & Financial Tracking (Minor Units in Kobo: e.g. 500000 = 5,000.00 NGN)
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  -- Conference Domain References
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  attendee_id UUID NOT NULL,

  -- Context & Reasons
  reason_category VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER_REQUEST' CHECK (
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
  reason TEXT,

  -- State Machine Constraints & Upstream Gateway Ref
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed', 'rejected')
  ),
  gateway_refund_id TEXT,
  error_message TEXT,

  -- Idempotency & Flexible Metadata
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes & Hardened Constraints
-- -----------------------------------------------------------------------------

-- 2. Strict Anti-Double-Refund Partial Unique Index:
-- Guarantees a ticket cannot have multiple active or completed refunds simultaneously.
CREATE UNIQUE INDEX uq_refunds_active_ticket 
ON refunds (ticket_id) 
WHERE status IN ('pending', 'processing', 'succeeded');

-- 3. Scoped Idempotency Unique Constraint (Per Attendee)
-- Prevents key collisions across different users while enabling strict idempotency per actor.
CREATE UNIQUE INDEX uq_refunds_attendee_idempotency 
ON refunds (attendee_id, idempotency_key);

-- 4. Foreign Key Coverage Indexes (Prevents Cascading Lock Contention)
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_ticket_id ON refunds(ticket_id);
CREATE INDEX idx_refunds_registration_id ON refunds(registration_id);

-- 5. High-Performance Partial Index for Dashboard & Reporting
-- Optimizes active queue processing without indexing millions of historical closed rows.
CREATE INDEX idx_refunds_active_event_status 
ON refunds (event_id, status, created_at DESC)
WHERE status IN ('pending', 'processing');

-- 6. Upstream Gateway Reference Lookup (For Webhook Reconciliations)
CREATE INDEX idx_refunds_gateway_refund_id 
ON refunds (gateway_refund_id) 
WHERE gateway_refund_id IS NOT NULL;

-- 7. Automatic updated_at trigger execution
CREATE TRIGGER update_refunds_updated_at 
BEFORE UPDATE ON refunds
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;