ALTER TABLE crypto_donations 
ADD COLUMN IF NOT EXISTS amount_in_crypto DECIMAL(20, 6),
ADD COLUMN IF NOT EXISTS donor_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

UPDATE crypto_donations 
SET tx_hash = tx_signature 
WHERE tx_hash IS NULL AND tx_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crypto_donations_tx_hash ON crypto_donations(tx_hash);
CREATE INDEX IF NOT EXISTS idx_crypto_donations_donor_wallet ON crypto_donations(donor_wallet_address);
CREATE INDEX IF NOT EXISTS idx_crypto_donations_network ON crypto_donations(network);
CREATE INDEX IF NOT EXISTS idx_crypto_donations_currency ON crypto_donations(currency);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS crypto_wallets JSONB DEFAULT '{}'::jsonb;

UPDATE profiles 
SET crypto_wallets = JSONB_BUILD_OBJECT(
  'metamask_address', COALESCE(crypto_wallets->>'ethereum', ''),
  'solana_address', COALESCE(crypto_wallets->>'solana', '')
)
WHERE crypto_wallets IS NOT NULL;

UPDATE profiles 
SET crypto_wallets = '{}'::jsonb
WHERE crypto_wallets IS NULL;

ALTER TABLE profiles 
DROP COLUMN IF EXISTS solana_wallet,
DROP COLUMN IF EXISTS cardano_wallet;

CREATE INDEX IF NOT EXISTS idx_profiles_crypto_wallets ON profiles USING GIN (crypto_wallets);

COMMENT ON COLUMN profiles.crypto_wallets IS 'JSONB object containing wallet addresses: {"metamask_address": "0x...", "solana_address": "..."}';

CREATE OR REPLACE FUNCTION has_any_crypto_wallet(profile_data JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (profile_data->>'metamask_address' IS NOT NULL AND profile_data->>'metamask_address' != '') OR
         (profile_data->>'solana_address' IS NOT NULL AND profile_data->>'solana_address' != '');
END;
$$;

CREATE OR REPLACE FUNCTION get_donations_by_network(cause_id_param UUID)
RETURNS TABLE (
  network TEXT,
  currency TEXT,
  total_amount DECIMAL,
  donation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.network,
    cd.currency,
    SUM(cd.amount_in_naira) as total_amount,
    COUNT(*) as donation_count
  FROM crypto_donations cd
  WHERE cd.cause_id = cause_id_param
  GROUP BY cd.network, cd.currency
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_crypto_donations(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  cause_id UUID,
  amount_in_crypto DECIMAL,
  amount_in_naira DECIMAL,
  network TEXT,
  currency TEXT,
  tx_hash TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  cause_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.cause_id,
    cd.amount_in_crypto,
    cd.amount_in_naira,
    cd.network,
    cd.currency,
    cd.tx_hash,
    cd.status,
    cd.created_at,
    c.title as cause_title
  FROM crypto_donations cd
  JOIN causes c ON cd.cause_id = c.id
  WHERE cd.user_id = user_id_param
  ORDER BY cd.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fix_address_checksum(address_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF address_text ~ '^0x[a-fA-F0-9]{40}$' THEN
    RETURN LOWER(address_text);
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

UPDATE crypto_donations 
SET user_id = '00000000-0000-0000-0000-000000000000'::UUID
WHERE user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crypto_donations' 
    AND column_name = 'amount_in_crypto'
  ) THEN
    RAISE EXCEPTION 'Migration failed: amount_in_crypto column not found';
  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'crypto_wallets'
  ) THEN
    RAISE EXCEPTION 'Migration failed: crypto_wallets column not found';
  END IF;

  RAISE NOTICE 'Crypto integration migration completed successfully!';
END $$;