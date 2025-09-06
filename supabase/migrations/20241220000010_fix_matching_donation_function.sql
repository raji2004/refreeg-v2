-- Fix the process_matching_donation function
-- The issue is that get_matching_pool_for_cause returns a table, not a single row

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
    -- Get the matching pool for this cause directly
    SELECT 
        mp.id,
        mp.matching_ratio,
        mp.remaining_amount
    INTO v_pool_id, v_matching_ratio, v_remaining_amount
    FROM public.matching_pool_causes mpc
    JOIN public.matching_pools mp ON mpc.matching_pool_id = mp.id
    WHERE mpc.cause_id = p_cause_id
    AND mp.is_active = true
    AND (mp.start_date IS NULL OR mp.start_date <= now())
    AND (mp.end_date IS NULL OR mp.end_date >= now())
    AND mp.remaining_amount > 0
    ORDER BY mp.created_at DESC
    LIMIT 1;
    
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
