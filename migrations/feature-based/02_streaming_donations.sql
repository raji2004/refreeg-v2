-- Migration: Streaming Donations
-- Description: Adds support for streaming donations (regular and crypto)
-- Date: 2024-01-XX
-- Feature: Streaming Donations

-- Create streaming_donations table
CREATE TABLE IF NOT EXISTS public.streaming_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cause_id UUID REFERENCES public.causes(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    stream_amount DECIMAL(15, 2) NOT NULL,
    stream_interval_seconds INTEGER DEFAULT 3600,
    total_streamed DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create crypto_streaming_donations table
CREATE TABLE IF NOT EXISTS public.crypto_streaming_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cause_id UUID REFERENCES public.causes(id) ON DELETE CASCADE,
    tx_signature TEXT UNIQUE NOT NULL,
    network TEXT NOT NULL,
    token_address TEXT,
    token_symbol TEXT,
    amount_in_crypto DECIMAL(20, 8) NOT NULL,
    amount_in_naira DECIMAL(15, 2) NOT NULL,
    stream_amount_crypto DECIMAL(20, 8) NOT NULL,
    stream_amount_naira DECIMAL(15, 2) NOT NULL,
    stream_interval_seconds INTEGER DEFAULT 3600,
    stream_duration_seconds INTEGER DEFAULT 86400,
    total_crypto_streamed DECIMAL(20, 8) DEFAULT 0,
    total_naira_streamed DECIMAL(15, 2) DEFAULT 0,
    recipient_address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_streaming_donations_user_id ON public.streaming_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_donations_cause_id ON public.streaming_donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_streaming_donations_is_active ON public.streaming_donations(is_active);

CREATE INDEX IF NOT EXISTS idx_crypto_streaming_donations_user_id ON public.crypto_streaming_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_streaming_donations_cause_id ON public.crypto_streaming_donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_crypto_streaming_donations_tx_signature ON public.crypto_streaming_donations(tx_signature);
CREATE INDEX IF NOT EXISTS idx_crypto_streaming_donations_is_active ON public.crypto_streaming_donations(is_active);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_streaming_donations_updated_at ON public.streaming_donations;
CREATE TRIGGER trigger_streaming_donations_updated_at
    BEFORE UPDATE ON public.streaming_donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_crypto_streaming_donations_updated_at ON public.crypto_streaming_donations;
CREATE TRIGGER trigger_crypto_streaming_donations_updated_at
    BEFORE UPDATE ON public.crypto_streaming_donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to process streaming donations
CREATE OR REPLACE FUNCTION public.process_streaming_donations()
RETURNS TABLE(processed_count INTEGER) AS $$
DECLARE
    v_streaming_donation RECORD;
    v_crypto_streaming_donation RECORD;
    v_processed_count INTEGER := 0;
    v_stream_amount DECIMAL(15, 2);
    v_crypto_stream_amount DECIMAL(20, 8);
    v_naira_stream_amount DECIMAL(15, 2);
BEGIN
    -- Process regular streaming donations
    FOR v_streaming_donation IN 
        SELECT * FROM public.streaming_donations 
        WHERE is_active = true 
        AND (total_streamed + stream_amount) <= amount
    LOOP
        v_stream_amount := LEAST(v_streaming_donation.stream_amount, 
                                v_streaming_donation.amount - v_streaming_donation.total_streamed);
        
        -- Update total streamed
        UPDATE public.streaming_donations 
        SET total_streamed = total_streamed + v_stream_amount,
            is_active = (total_streamed + v_stream_amount) < amount,
            updated_at = now()
        WHERE id = v_streaming_donation.id;
        
        -- Increment cause raised amount
        PERFORM public.increment_cause_raised(v_streaming_donation.cause_id, v_stream_amount);
        
        v_processed_count := v_processed_count + 1;
    END LOOP;
    
    -- Process crypto streaming donations
    FOR v_crypto_streaming_donation IN 
        SELECT * FROM public.crypto_streaming_donations 
        WHERE is_active = true 
        AND (total_crypto_streamed + stream_amount_crypto) <= amount_in_crypto
    LOOP
        v_crypto_stream_amount := LEAST(v_crypto_streaming_donation.stream_amount_crypto, 
                                       v_crypto_streaming_donation.amount_in_crypto - v_crypto_streaming_donation.total_crypto_streamed);
        v_naira_stream_amount := LEAST(v_crypto_streaming_donation.stream_amount_naira, 
                                      v_crypto_streaming_donation.amount_in_naira - v_crypto_streaming_donation.total_naira_streamed);
        
        -- Update total streamed
        UPDATE public.crypto_streaming_donations 
        SET total_crypto_streamed = total_crypto_streamed + v_crypto_stream_amount,
            total_naira_streamed = total_naira_streamed + v_naira_stream_amount,
            is_active = (total_crypto_streamed + v_crypto_stream_amount) < amount_in_crypto,
            updated_at = now()
        WHERE id = v_crypto_streaming_donation.id;
        
        -- Increment cause raised amount
        PERFORM public.increment_cause_raised(v_crypto_streaming_donation.cause_id, v_naira_stream_amount);
        
        v_processed_count := v_processed_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get streaming status
CREATE OR REPLACE FUNCTION public.get_streaming_status(p_cause_id UUID)
RETURNS TABLE(
    total_streamed DECIMAL(15,2),
    current_stream_rate DECIMAL(15,2),
    active_streams INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(sd.total_streamed), 0) as total_streamed,
        COALESCE(SUM(sd.stream_amount), 0) as current_stream_rate,
        COUNT(*)::INTEGER as active_streams
    FROM public.streaming_donations sd
    WHERE sd.cause_id = p_cause_id AND sd.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get crypto streaming status
CREATE OR REPLACE FUNCTION public.get_crypto_streaming_status(p_cause_id UUID)
RETURNS TABLE(
    total_crypto_streamed DECIMAL(20,8),
    total_naira_streamed DECIMAL(15,2),
    current_crypto_stream_rate DECIMAL(20,8),
    current_naira_stream_rate DECIMAL(15,2),
    active_streams INTEGER,
    crypto_currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(csd.total_crypto_streamed), 0) as total_crypto_streamed,
        COALESCE(SUM(csd.total_naira_streamed), 0) as total_naira_streamed,
        COALESCE(SUM(csd.stream_amount_crypto), 0) as current_crypto_stream_rate,
        COALESCE(SUM(csd.stream_amount_naira), 0) as current_naira_stream_rate,
        COUNT(*)::INTEGER as active_streams,
        COALESCE(MAX(csd.token_symbol), 'MATIC') as crypto_currency
    FROM public.crypto_streaming_donations csd
    WHERE csd.cause_id = p_cause_id AND csd.is_active = true;
END;
$$ LANGUAGE plpgsql;