-- Migration: Matching Pool (Main Database)
-- Description: Adds support for matching fund pools and auto-redirect functionality
-- Date: 2024-01-XX
-- Feature: Matching Pool
-- Status: ALREADY EXISTS - Only adding missing functions

-- Note: matching_pools, matching_pool_causes, and matching_donations tables already exist
-- This migration only adds the missing functions

-- Create function to process matching donation (if not exists)
CREATE OR REPLACE FUNCTION public.process_matching_donation(
    p_cause_id UUID,
    p_original_amount DECIMAL(15,2),
    p_original_donation_id UUID DEFAULT NULL,
    p_original_donation_type TEXT DEFAULT 'donation'
)
RETURNS TABLE(matched_amount DECIMAL(15,2), pool_id UUID, success BOOLEAN) AS $$
DECLARE
    v_pool_id UUID;
    v_matching_ratio DECIMAL(5,2);
    v_remaining_amount DECIMAL(15,2);
    v_matched_amount DECIMAL(15,2);
    v_actual_matched_amount DECIMAL(15,2);
BEGIN
    -- Get the matching pool for this cause
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
$$ LANGUAGE plpgsql;

-- Create function to get matching status (if not exists)
CREATE OR REPLACE FUNCTION public.get_matching_status(p_cause_id UUID)
RETURNS TABLE(
    pool_id UUID,
    pool_name TEXT,
    matching_ratio DECIMAL(5,2),
    remaining_amount DECIMAL(15,2),
    eligibility BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id as pool_id,
        mp.name as pool_name,
        mp.matching_ratio,
        mp.remaining_amount,
        (mp.is_active = true 
         AND (mp.start_date IS NULL OR mp.start_date <= now())
         AND (mp.end_date IS NULL OR mp.end_date >= now())
         AND mp.remaining_amount > 0) as eligibility
    FROM public.matching_pool_causes mpc
    JOIN public.matching_pools mp ON mpc.matching_pool_id = mp.id
    WHERE mpc.cause_id = p_cause_id
    ORDER BY mp.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
