-- Migration: NFT Petition System
-- Description: Adds NFT support for petition signatures
-- Date: 2024-01-XX
-- Feature: NFT Petition System

-- Add NFT-related columns to existing petitions table
ALTER TABLE public.petitions 
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS contract_petition_id INTEGER,
ADD COLUMN IF NOT EXISTS network TEXT,
ADD COLUMN IF NOT EXISTS nft_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_count INTEGER DEFAULT 0;

-- Create petition_signatures table
CREATE TABLE IF NOT EXISTS public.petition_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    petition_id UUID REFERENCES public.petitions(id) ON DELETE CASCADE,
    signer_address TEXT NOT NULL,
    token_id INTEGER,
    signature_message TEXT,
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create petition_categories table
CREATE TABLE IF NOT EXISTS public.petition_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create petition_category_mapping table
CREATE TABLE IF NOT EXISTS public.petition_category_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    petition_id UUID REFERENCES public.petitions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.petition_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(petition_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_petitions_contract_address ON public.petitions(contract_address);
CREATE INDEX IF NOT EXISTS idx_petitions_nft_enabled ON public.petitions(nft_enabled);
CREATE INDEX IF NOT EXISTS idx_petition_signatures_petition_id ON public.petition_signatures(petition_id);
CREATE INDEX IF NOT EXISTS idx_petition_signatures_signer_address ON public.petition_signatures(signer_address);
CREATE INDEX IF NOT EXISTS idx_petition_signatures_token_id ON public.petition_signatures(token_id);
CREATE INDEX IF NOT EXISTS idx_petition_category_mapping_petition_id ON public.petition_category_mapping(petition_id);
CREATE INDEX IF NOT EXISTS idx_petition_category_mapping_category_id ON public.petition_category_mapping(category_id);

-- Create function to update petition signature count
CREATE OR REPLACE FUNCTION public.update_petition_signature_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update signature count for the petition
    UPDATE public.petitions 
    SET signature_count = (
        SELECT COUNT(*) 
        FROM public.petition_signatures 
        WHERE petition_id = COALESCE(NEW.petition_id, OLD.petition_id)
    ),
    updated_at = now()
    WHERE id = COALESCE(NEW.petition_id, OLD.petition_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for petition signature count
DROP TRIGGER IF EXISTS trigger_update_petition_signature_count ON public.petition_signatures;
CREATE TRIGGER trigger_update_petition_signature_count
    AFTER INSERT OR UPDATE OR DELETE ON public.petition_signatures
    FOR EACH ROW
    EXECUTE FUNCTION public.update_petition_signature_count();

-- Create function to get petition stats
CREATE OR REPLACE FUNCTION public.get_petition_stats(p_petition_id UUID)
RETURNS TABLE(
    total_signatures INTEGER,
    unique_signers INTEGER,
    nft_enabled BOOLEAN,
    contract_address TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.signature_count as total_signatures,
        COUNT(DISTINCT ps.signer_address)::INTEGER as unique_signers,
        p.nft_enabled,
        p.contract_address
    FROM public.petitions p
    LEFT JOIN public.petition_signatures ps ON p.id = ps.petition_id
    WHERE p.id = p_petition_id
    GROUP BY p.id, p.signature_count, p.nft_enabled, p.contract_address;
END;
$$ LANGUAGE plpgsql;

-- Insert default petition categories
INSERT INTO public.petition_categories (name, description) VALUES
('Environment', 'Environmental protection and climate action'),
('Human Rights', 'Human rights and social justice'),
('Education', 'Education and learning initiatives'),
('Health', 'Healthcare and medical causes'),
('Animal Welfare', 'Animal rights and welfare'),
('Community', 'Local community development'),
('Technology', 'Technology and innovation'),
('Politics', 'Political and governance issues')
ON CONFLICT (name) DO NOTHING;