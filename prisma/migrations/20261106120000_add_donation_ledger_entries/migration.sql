-- Append-only outbox of donation records anchored on-chain.
CREATE TABLE "donation_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_type" VARCHAR NOT NULL,
    "source_id" UUID NOT NULL,
    "cause_id" UUID NOT NULL,
    "kind" VARCHAR NOT NULL DEFAULT 'donation',
    "amount_kobo" BIGINT NOT NULL,
    "payload" TEXT NOT NULL,
    "payload_hash" VARCHAR(66) NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'pending',
    "chain_id" INTEGER,
    "tx_hash" VARCHAR(66),
    "block_number" BIGINT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "donation_ledger_source_unique" ON "donation_ledger_entries"("source_type", "source_id", "kind");
CREATE INDEX "idx_donation_ledger_status_created" ON "donation_ledger_entries"("status", "created_at");
CREATE INDEX "idx_donation_ledger_cause_id" ON "donation_ledger_entries"("cause_id");
CREATE INDEX "idx_donation_ledger_tx_hash" ON "donation_ledger_entries"("tx_hash");

-- The record itself is immutable once written; only delivery-tracking columns may change.
CREATE OR REPLACE FUNCTION donation_ledger_entries_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'donation_ledger_entries is append-only';
  END IF;
  IF NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.cause_id IS DISTINCT FROM OLD.cause_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.amount_kobo IS DISTINCT FROM OLD.amount_kobo
     OR NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash THEN
    RAISE EXCEPTION 'donation ledger record fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donation_ledger_entries_guard
BEFORE UPDATE OR DELETE ON "donation_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION donation_ledger_entries_guard();
