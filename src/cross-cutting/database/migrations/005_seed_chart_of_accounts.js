/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Ensure Account Type Enum exists
  await knex.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_account_type') THEN
        CREATE TYPE ledger_account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
      END IF;
    END $$;
  `);

  // 2. Seed Standard Chart of Accounts (COA)
  // ON CONFLICT (code) DO NOTHING ensures this is safe to rerun idempotently
  await knex.raw(`
    INSERT INTO ledger_accounts (code, name, type, currency, is_active)
    VALUES
      -- 1000s: ASSETS (Settlement accounts, Clearing, Cash equivalents)
      ('1000_PAYSTACK_SETTLEMENT_NGN', 'Paystack Settlement Account (NGN)', 'ASSET', 'NGN', true),
      ('1001_FLUTTERWAVE_SETTLEMENT_NGN', 'Flutterwave Settlement Account (NGN)', 'ASSET', 'NGN', true),
      ('1002_STRIPE_SETTLEMENT_USD', 'Stripe Settlement Account (USD)', 'ASSET', 'USD', true),
      ('1010_BANK_SETTLEMENT_CLEARING', 'Interbank Settlement Clearing Account', 'ASSET', 'NGN', true),

      -- 2000s: LIABILITIES (Customer wallets, Payables, Suspense)
      ('2000_CUSTOMER_WALLETS_NGN', 'Customer Wallet Liabilities (NGN)', 'LIABILITY', 'NGN', true),
      ('2001_CUSTOMER_WALLETS_USD', 'Customer Wallet Liabilities (USD)', 'LIABILITY', 'USD', true),
      ('2010_PENDING_REFUNDS_PAYABLE', 'Pending Customer Refunds Payable', 'LIABILITY', 'NGN', true),
      ('2020_UNALLOCATED_SUSPENSE', 'Unallocated / Suspense Clearing Account', 'LIABILITY', 'NGN', true),

      -- 3000s: EQUITY (Capital, Retained Earnings)
      ('3000_RETAINED_EARNINGS', 'Retained Earnings', 'EQUITY', 'NGN', true),

      -- 4000s: REVENUE (Platform fees, Interchange, Commissions)
      ('4000_PROCESSING_FEE_REVENUE', 'Transaction Processing Fee Revenue', 'REVENUE', 'NGN', true),
      ('4001_INTERCHANGE_REVENUE', 'Card Interchange Commission Revenue', 'REVENUE', 'NGN', true),

      -- 5000s: EXPENSES (Gateway processing charges, Payout costs)
      ('5000_GATEWAY_PROCESSING_EXPENSE', 'Payment Gateway Partner Charges', 'EXPENSE', 'NGN', true),
      ('5001_INTERBANK_PAYOUT_EXPENSE', 'NIBSS / Instant Transfer Payout Fees', 'EXPENSE', 'NGN', true)

    ON CONFLICT (code) DO NOTHING;
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Clean up seeded accounts by unique system codes
  await knex.raw(`
    DELETE FROM ledger_accounts 
    WHERE code IN (
      '1000_PAYSTACK_SETTLEMENT_NGN',
      '1001_FLUTTERWAVE_SETTLEMENT_NGN',
      '1002_STRIPE_SETTLEMENT_USD',
      '1010_BANK_SETTLEMENT_CLEARING',
      '2000_CUSTOMER_WALLETS_NGN',
      '2001_CUSTOMER_WALLETS_USD',
      '2010_PENDING_REFUNDS_PAYABLE',
      '2020_UNALLOCATED_SUSPENSE',
      '3000_RETAINED_EARNINGS',
      '4000_PROCESSING_FEE_REVENUE',
      '4001_INTERCHANGE_REVENUE',
      '5000_GATEWAY_PROCESSING_EXPENSE',
      '5001_INTERBANK_PAYOUT_EXPENSE'
    );
  `);
}