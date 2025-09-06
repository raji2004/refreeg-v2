-- Fix the get_matching_pool_for_cause function to include total_amount
-- This ensures the progress bar can calculate the correct percentage

CREATE OR REPLACE FUNCTION public.get_matching_pool_for_cause(
    p_cause_id UUID
)
RETURNS TABLE(
    pool_id UUID,
    pool_name TEXT,
    matching_ratio DECIMAL(5,2),
    total_amount DECIMAL(15,2),
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
        mp.total_amount,
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
