-- =====================================================
-- MATCHING POOL SYSTEM MIGRATION
-- Creates tables and functions for donation matching
-- =====================================================

-- 1. Create matching_pools table
CREATE TABLE IF NOT EXISTS public.matching_pools (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    matching_ratio DECIMAL(5,2) NOT NULL DEFAULT 0.2, -- 0.2 = 1:5 ratio
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT matching_pools_pkey PRIMARY KEY (id)
);

-- 2. Create matching_pool_causes table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.matching_pool_causes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    matching_pool_id UUID NOT NULL REFERENCES public.matching_pools(id) ON DELETE CASCADE,
    cause_id UUID NOT NULL REFERENCES public.causes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT matching_pool_causes_pkey PRIMARY KEY (id),
    CONSTRAINT matching_pool_causes_unique UNIQUE (matching_pool_id, cause_id)
);

-- 3. Create matching_donations table (tracks matched donations)
CREATE TABLE IF NOT EXISTS public.matching_donations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    matching_pool_id UUID NOT NULL REFERENCES public.matching_pools(id) ON DELETE CASCADE,
    original_donation_id UUID, -- References donations or crypto_donations
    original_donation_type TEXT NOT NULL, -- 'donation' or 'crypto_donation'
    original_amount DECIMAL(15,2) NOT NULL,
    matched_amount DECIMAL(15,2) NOT NULL,
    cause_id UUID NOT NULL REFERENCES public.causes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT matching_donations_pkey PRIMARY KEY (id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_matching_pools_active ON public.matching_pools(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_matching_pool_causes_pool_id ON public.matching_pool_causes(matching_pool_id);
CREATE INDEX IF NOT EXISTS idx_matching_pool_causes_cause_id ON public.matching_pool_causes(cause_id);
CREATE INDEX IF NOT EXISTS idx_matching_donations_pool_id ON public.matching_donations(matching_pool_id);
CREATE INDEX IF NOT EXISTS idx_matching_donations_cause_id ON public.matching_donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_matching_donations_created_at ON public.matching_donations(created_at);

-- 5. Create function to check if cause is eligible for matching
CREATE OR REPLACE FUNCTION public.is_cause_eligible_for_matching(
    p_cause_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    eligible_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO eligible_count
    FROM public.matching_pool_causes mpc
    JOIN public.matching_pools mp ON mpc.matching_pool_id = mp.id
    WHERE mpc.cause_id = p_cause_id
    AND mp.is_active = true
    AND (mp.start_date IS NULL OR mp.start_date <= now())
    AND (mp.end_date IS NULL OR mp.end_date >= now())
    AND mp.remaining_amount > 0;
    
    RETURN eligible_count > 0;
END;
$$;

-- 6. Create function to get matching pool for a cause
CREATE OR REPLACE FUNCTION public.get_matching_pool_for_cause(
    p_cause_id UUID
)
RETURNS TABLE(
    pool_id UUID,
    pool_name TEXT,
    matching_ratio DECIMAL(5,2),
    remaining_amount DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id as pool_id,
        mp.name as pool_name,
        mp.matching_ratio,
        mp.remaining_amount
    FROM public.matching_pool_causes mpc
    JOIN public.matching_pools mp ON mpc.matching_pool_id = mp.id
    WHERE mpc.cause_id = p_cause_id
    AND mp.is_active = true
    AND (mp.start_date IS NULL OR mp.start_date <= now())
    AND (mp.end_date IS NULL OR mp.end_date >= now())
    AND mp.remaining_amount > 0
    ORDER BY mp.created_at DESC
    LIMIT 1;
END;
$$;

-- 7. Create function to process matching donation
CREATE OR REPLACE FUNCTION public.process_matching_donation(
    p_cause_id UUID,
    p_original_donation_id UUID,
    p_original_donation_type TEXT,
    p_original_amount DECIMAL(15,2)
)
RETURNS TABLE(
    matched_amount DECIMAL(15,2),
    pool_id UUID,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool_id UUID;
    v_matching_ratio DECIMAL(5,2);
    v_remaining_amount DECIMAL(15,2);
    v_matched_amount DECIMAL(15,2);
    v_actual_matched_amount DECIMAL(15,2);
BEGIN
    -- Get the matching pool for this cause
    SELECT pool_id, matching_ratio, remaining_amount
    INTO v_pool_id, v_matching_ratio, v_remaining_amount
    FROM public.get_matching_pool_for_cause(p_cause_id);
    
    -- If no matching pool found, return zero
    IF v_pool_id IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL(15,2), NULL::UUID, false;
        RETURN;
    END IF;
    
    -- Calculate matched amount
    v_matched_amount := p_original_amount * v_matching_ratio;
    
    -- Check if pool has enough remaining amount
    IF v_matched_amount > v_remaining_amount THEN
        v_actual_matched_amount := v_remaining_amount;
    ELSE
        v_actual_matched_amount := v_matched_amount;
    END IF;
    
    -- Insert matching donation record
    INSERT INTO public.matching_donations (
        matching_pool_id,
        original_donation_id,
        original_donation_type,
        original_amount,
        matched_amount,
        cause_id
    ) VALUES (
        v_pool_id,
        p_original_donation_id,
        p_original_donation_type,
        p_original_amount,
        v_actual_matched_amount,
        p_cause_id
    );
    
    -- Update remaining amount in matching pool
    UPDATE public.matching_pools
    SET remaining_amount = remaining_amount - v_actual_matched_amount,
        updated_at = now()
    WHERE id = v_pool_id;
    
    -- Update cause raised amount
    UPDATE public.causes
    SET raised = COALESCE(raised, 0) + v_actual_matched_amount,
        updated_at = now()
    WHERE id = p_cause_id;
    
    RETURN QUERY SELECT v_actual_matched_amount, v_pool_id, true;
END;
$$;

-- 8. Create trigger for updated_at on matching_pools
CREATE OR REPLACE FUNCTION public.update_matching_pools_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at on matching_pools (with error handling)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_matching_pools_updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_matching_pools_updated_at
            BEFORE UPDATE ON public.matching_pools
            FOR EACH ROW
            EXECUTE FUNCTION public.update_matching_pools_updated_at();
    END IF;
END $$;

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matching_pools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matching_pool_causes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matching_donations TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cause_eligible_for_matching(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_matching_pool_for_cause(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_matching_donation(UUID, UUID, TEXT, DECIMAL) TO authenticated;
