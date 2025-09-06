-- Rollback: All Crypto Features
-- Description: Removes all crypto-related features from the database
-- Date: 2024-01-XX
-- WARNING: This will permanently delete all crypto-related data

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.petition_category_mapping CASCADE;
DROP TABLE IF EXISTS public.petition_signatures CASCADE;
DROP TABLE IF EXISTS public.petition_categories CASCADE;
DROP TABLE IF EXISTS public.matching_donations CASCADE;
DROP TABLE IF EXISTS public.matching_pool_causes CASCADE;
DROP TABLE IF EXISTS public.matching_pools CASCADE;
DROP TABLE IF EXISTS public.crypto_streaming_donations CASCADE;
DROP TABLE IF EXISTS public.streaming_donations CASCADE;
DROP TABLE IF EXISTS public.crypto_donations CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_petition_stats(UUID);
DROP FUNCTION IF EXISTS public.update_petition_signature_count();
DROP FUNCTION IF EXISTS public.get_matching_status(UUID);
DROP FUNCTION IF EXISTS public.process_matching_donation(UUID, DECIMAL, UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_crypto_streaming_status(UUID);
DROP FUNCTION IF EXISTS public.get_streaming_status(UUID);
DROP FUNCTION IF EXISTS public.process_streaming_donations();
DROP FUNCTION IF EXISTS public.confirm_crypto_donation(TEXT);
DROP FUNCTION IF EXISTS public.increment_cause_raised(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Remove columns from existing tables
ALTER TABLE public.petitions 
DROP COLUMN IF EXISTS contract_address,
DROP COLUMN IF EXISTS contract_petition_id,
DROP COLUMN IF EXISTS network,
DROP COLUMN IF EXISTS nft_enabled,
DROP COLUMN IF EXISTS signature_count;

ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS crypto_wallets;