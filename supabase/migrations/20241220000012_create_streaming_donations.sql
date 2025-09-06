-- =====================================================
-- STREAMING DONATIONS SYSTEM
-- Creates tables and functions for real-time streaming donations
-- =====================================================

-- 1. Create streaming_donations table
CREATE TABLE IF NOT EXISTS public.streaming_donations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cause_id UUID NOT NULL REFERENCES public.causes(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    donor_name TEXT NOT NULL,
    donor_email TEXT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    streamed_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2) NOT NULL,
    stream_rate_per_second DECIMAL(15,8) NOT NULL, -- Amount to stream per second
    stream_duration_seconds INTEGER NOT NULL, -- Total duration in seconds
    stream_interval_seconds INTEGER NOT NULL DEFAULT 1, -- How often to process (1 = per second)
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT streaming_donations_pkey PRIMARY KEY (id)
);

-- 2. Create streaming_schedules table (for processing)
CREATE TABLE IF NOT EXISTS public.streaming_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    streaming_donation_id UUID NOT NULL REFERENCES public.streaming_donations(id) ON DELETE CASCADE,
    next_process_at TIMESTAMPTZ NOT NULL,
    amount_to_stream DECIMAL(15,8) NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT streaming_schedules_pkey PRIMARY KEY (id)
);

-- 3. Create streaming_transactions table (for tracking individual transfers)
CREATE TABLE IF NOT EXISTS public.streaming_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    streaming_donation_id UUID NOT NULL REFERENCES public.streaming_donations(id) ON DELETE CASCADE,
    amount DECIMAL(15,8) NOT NULL,
    transaction_type TEXT NOT NULL, -- 'stream', 'pause', 'resume', 'cancel', 'complete'
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB,
    CONSTRAINT streaming_transactions_pkey PRIMARY KEY (id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_streaming_donations_cause_id ON public.streaming_donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_streaming_donations_donor_id ON public.streaming_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_streaming_donations_active ON public.streaming_donations(is_active, is_paused);
CREATE INDEX IF NOT EXISTS idx_streaming_donations_started_at ON public.streaming_donations(started_at);
CREATE INDEX IF NOT EXISTS idx_streaming_schedules_next_process ON public.streaming_schedules(next_process_at, is_processed);
CREATE INDEX IF NOT EXISTS idx_streaming_schedules_donation_id ON public.streaming_schedules(streaming_donation_id);
CREATE INDEX IF NOT EXISTS idx_streaming_transactions_donation_id ON public.streaming_transactions(streaming_donation_id);

-- 5. Create function to start streaming donation
CREATE OR REPLACE FUNCTION public.start_streaming_donation(
    p_streaming_donation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_donation RECORD;
    v_interval_seconds INTEGER;
    v_rate_per_second DECIMAL(15,8);
    v_next_process_at TIMESTAMPTZ;
    v_i INTEGER;
BEGIN
    -- Get donation details
    SELECT * INTO v_donation
    FROM public.streaming_donations
    WHERE id = p_streaming_donation_id
    AND is_active = true
    AND started_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Calculate streaming parameters
    v_interval_seconds := v_donation.stream_interval_seconds;
    v_rate_per_second := v_donation.stream_rate_per_second;
    v_next_process_at := now();
    
    -- Update donation status
    UPDATE public.streaming_donations
    SET started_at = now(),
        updated_at = now()
    WHERE id = p_streaming_donation_id;
    
    -- Create initial streaming schedule
    INSERT INTO public.streaming_schedules (
        streaming_donation_id,
        next_process_at,
        amount_to_stream,
        is_processed
    ) VALUES (
        p_streaming_donation_id,
        v_next_process_at,
        v_rate_per_second * v_interval_seconds,
        false
    );
    
    RETURN true;
END;
$$;

-- 6. Create function to process streaming donations
CREATE OR REPLACE FUNCTION public.process_streaming_donations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schedule RECORD;
    v_processed_count INTEGER := 0;
    v_stream_amount DECIMAL(15,8);
    v_new_remaining DECIMAL(15,2);
    v_new_streamed DECIMAL(15,2);
    v_is_complete BOOLEAN;
BEGIN
    -- Get all due streaming schedules
    FOR v_schedule IN
        SELECT 
            ss.*,
            sd.cause_id,
            sd.total_amount,
            sd.streamed_amount,
            sd.remaining_amount,
            sd.stream_rate_per_second,
            sd.stream_interval_seconds,
            sd.is_active,
            sd.is_paused
        FROM public.streaming_schedules ss
        JOIN public.streaming_donations sd ON ss.streaming_donation_id = sd.id
        WHERE ss.next_process_at <= now()
        AND ss.is_processed = false
        AND sd.is_active = true
        AND sd.is_paused = false
        ORDER BY ss.next_process_at
    LOOP
        -- Calculate amount to stream
        v_stream_amount := LEAST(
            v_schedule.amount_to_stream,
            v_schedule.remaining_amount
        );
        
        -- Update streaming donation
        v_new_streamed := v_schedule.streamed_amount + v_stream_amount;
        v_new_remaining := v_schedule.remaining_amount - v_stream_amount;
        v_is_complete := (v_new_remaining <= 0);
        
        UPDATE public.streaming_donations
        SET streamed_amount = v_new_streamed,
            remaining_amount = v_new_remaining,
            is_active = NOT v_is_complete,
            completed_at = CASE WHEN v_is_complete THEN now() ELSE completed_at END,
            updated_at = now()
        WHERE id = v_schedule.streaming_donation_id;
        
        -- Update cause raised amount
        UPDATE public.causes
        SET raised = COALESCE(raised, 0) + v_stream_amount,
            updated_at = now()
        WHERE id = v_schedule.cause_id;
        
        -- Record transaction
        INSERT INTO public.streaming_transactions (
            streaming_donation_id,
            amount,
            transaction_type,
            processed_at
        ) VALUES (
            v_schedule.streaming_donation_id,
            v_stream_amount,
            'stream',
            now()
        );
        
        -- Mark schedule as processed
        UPDATE public.streaming_schedules
        SET is_processed = true
        WHERE id = v_schedule.id;
        
        -- Create next schedule if not complete
        IF NOT v_is_complete THEN
            INSERT INTO public.streaming_schedules (
                streaming_donation_id,
                next_process_at,
                amount_to_stream,
                is_processed
            ) VALUES (
                v_schedule.streaming_donation_id,
                now() + (v_schedule.stream_interval_seconds || ' seconds')::INTERVAL,
                v_schedule.stream_rate_per_second * v_schedule.stream_interval_seconds,
                false
            );
        END IF;
        
        v_processed_count := v_processed_count + 1;
    END LOOP;
    
    RETURN v_processed_count;
END;
$$;

-- 7. Create function to pause/resume streaming
CREATE OR REPLACE FUNCTION public.toggle_streaming_donation(
    p_streaming_donation_id UUID,
    p_action TEXT -- 'pause' or 'resume'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_donation RECORD;
BEGIN
    -- Get donation details
    SELECT * INTO v_donation
    FROM public.streaming_donations
    WHERE id = p_streaming_donation_id
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    IF p_action = 'pause' AND NOT v_donation.is_paused THEN
        UPDATE public.streaming_donations
        SET is_paused = true,
            paused_at = now(),
            updated_at = now()
        WHERE id = p_streaming_donation_id;
        
        -- Record transaction
        INSERT INTO public.streaming_transactions (
            streaming_donation_id,
            amount,
            transaction_type,
            processed_at
        ) VALUES (
            p_streaming_donation_id,
            0,
            'pause',
            now()
        );
        
    ELSIF p_action = 'resume' AND v_donation.is_paused THEN
        UPDATE public.streaming_donations
        SET is_paused = false,
            paused_at = NULL,
            updated_at = now()
        WHERE id = p_streaming_donation_id;
        
        -- Create new schedule for resumed streaming
        INSERT INTO public.streaming_schedules (
            streaming_donation_id,
            next_process_at,
            amount_to_stream,
            is_processed
        ) VALUES (
            p_streaming_donation_id,
            now() + (v_donation.stream_interval_seconds || ' seconds')::INTERVAL,
            v_donation.stream_rate_per_second * v_donation.stream_interval_seconds,
            false
        );
        
        -- Record transaction
        INSERT INTO public.streaming_transactions (
            streaming_donation_id,
            amount,
            transaction_type,
            processed_at
        ) VALUES (
            p_streaming_donation_id,
            0,
            'resume',
            now()
        );
    END IF;
    
    RETURN true;
END;
$$;

-- 8. Create function to get live streaming status
CREATE OR REPLACE FUNCTION public.get_live_streaming_status(
    p_cause_id UUID
)
RETURNS TABLE(
    total_streaming_amount DECIMAL(15,2),
    total_streamed_amount DECIMAL(15,2),
    active_streams_count INTEGER,
    current_stream_rate_per_second DECIMAL(15,8)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(sd.total_amount), 0) as total_streaming_amount,
        COALESCE(SUM(sd.streamed_amount), 0) as total_streamed_amount,
        COUNT(CASE WHEN sd.is_active AND NOT sd.is_paused THEN 1 END)::INTEGER as active_streams_count,
        COALESCE(SUM(CASE WHEN sd.is_active AND NOT sd.is_paused THEN sd.stream_rate_per_second ELSE 0 END), 0) as current_stream_rate_per_second
    FROM public.streaming_donations sd
    WHERE sd.cause_id = p_cause_id;
END;
$$;

-- 9. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_streaming_donations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at on streaming_donations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_streaming_donations_updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_streaming_donations_updated_at
            BEFORE UPDATE ON public.streaming_donations
            FOR EACH ROW
            EXECUTE FUNCTION public.update_streaming_donations_updated_at();
    END IF;
END $$;

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaming_donations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaming_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaming_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_streaming_donation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_streaming_donations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_streaming_donation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_streaming_status(UUID) TO authenticated;
