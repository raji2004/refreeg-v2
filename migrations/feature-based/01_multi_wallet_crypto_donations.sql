-- Migration: Multi-Wallet Crypto Donations
-- Description: Adds support for multiple crypto wallet addresses and crypto donations
-- Date: 2024-01-XX
-- Feature: Multi-Wallet Crypto Donations

-- Add crypto_wallets column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS crypto_wallets JSONB DEFAULT '{}'::jsonb;

-- Create crypto_donations table
CREATE TABLE IF NOT EXISTS public.crypto_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cause_id UUID REFERENCES public.causes(id) ON DELETE CASCADE,
    tx_signature TEXT UNIQUE NOT NULL,
    network TEXT NOT NULL,
    token_address TEXT,
    token_symbol TEXT,
    amount_in_crypto DECIMAL(20, 8) NOT NULL,
    amount_in_naira DECIMAL(15, 2) NOT NULL,
    recipient_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crypto_donations_user_id ON public.crypto_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_donations_cause_id ON public.crypto_donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_crypto_donations_tx_signature ON public.crypto_donations(tx_signature);
CREATE INDEX IF NOT EXISTS idx_crypto_donations_status ON public.crypto_donations(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for crypto_donations
DROP TRIGGER IF EXISTS trigger_crypto_donations_updated_at ON public.crypto_donations;
CREATE TRIGGER trigger_crypto_donations_updated_at
    BEFORE UPDATE ON public.crypto_donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to increment cause raised amount
CREATE OR REPLACE FUNCTION public.increment_cause_raised(p_cause_id UUID, p_amount DECIMAL(15,2))
RETURNS VOID AS $$
BEGIN
    UPDATE public.causes 
    SET raised = COALESCE(raised, 0) + p_amount,
        updated_at = now()
    WHERE id = p_cause_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to confirm crypto donation
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