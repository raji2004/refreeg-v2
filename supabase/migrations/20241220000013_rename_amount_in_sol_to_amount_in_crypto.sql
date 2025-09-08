-- Rename amount_in_sol to amount_in_crypto for generic crypto support
ALTER TABLE public.crypto_donations 
RENAME COLUMN amount_in_sol TO amount_in_crypto;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.crypto_donations.amount_in_crypto IS 'Amount in the original cryptocurrency (not necessarily SOL)';
