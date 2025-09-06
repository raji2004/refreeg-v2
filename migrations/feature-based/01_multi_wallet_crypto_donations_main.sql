-- Migration: Multi-Wallet Crypto Donations (Main Database)
-- Description: Adds support for multiple crypto wallet addresses and crypto donations
-- Date: 2024-01-XX
-- Feature: Multi-Wallet Crypto Donations
-- Status: MOSTLY ALREADY EXISTS - Only adding missing functions

-- Note: crypto_wallets column and crypto_donations table already exist in main DB
-- This migration only adds the missing functions

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment cause raised amount (if not exists)
CREATE OR REPLACE FUNCTION public.increment_cause_raised(p_cause_id UUID, p_amount DECIMAL(15,2))
RETURNS VOID AS $$
BEGIN
    UPDATE public.causes 
    SET raised = COALESCE(raised, 0) + p_amount,
        updated_at = now()
    WHERE id = p_cause_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to confirm crypto donation (if not exists)
CREATE OR REPLACE FUNCTION public.confirm_crypto_donation(p_tx_signature TEXT)
RETURNS VOID AS $$
DECLARE
    v_donation RECORD;
BEGIN
    -- Get donation details
    SELECT * INTO v_donation 
    FROM public.crypto_donations 
    WHERE tx_signature = p_tx_signature;
    
    -- Update status to completed
    UPDATE public.crypto_donations 
    SET status = 'completed',
        updated_at = now()
    WHERE tx_signature = p_tx_signature;
    
    -- Increment cause raised amount
    PERFORM public.increment_cause_raised(v_donation.cause_id, v_donation.amount_in_naira);
END;
$$ LANGUAGE plpgsql;
