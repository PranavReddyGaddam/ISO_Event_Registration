-- Migration: Add per-event cleared amounts table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.volunteer_event_cleared_amounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    volunteer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    cleared_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (cleared_amount >= 0),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT volunteer_event_cleared_amounts_unique UNIQUE (volunteer_id, event_id)
);

CREATE INDEX idx_veca_volunteer_id ON public.volunteer_event_cleared_amounts(volunteer_id);
CREATE INDEX idx_veca_event_id ON public.volunteer_event_cleared_amounts(event_id);

CREATE TRIGGER update_volunteer_event_cleared_amounts_updated_at
    BEFORE UPDATE ON public.volunteer_event_cleared_amounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.volunteer_event_cleared_amounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "volunteer_event_cleared_amounts select policy"
    ON public.volunteer_event_cleared_amounts FOR SELECT
    USING (true);

CREATE POLICY "volunteer_event_cleared_amounts insert policy"
    ON public.volunteer_event_cleared_amounts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "volunteer_event_cleared_amounts update policy"
    ON public.volunteer_event_cleared_amounts FOR UPDATE
    USING (true);

GRANT ALL ON public.volunteer_event_cleared_amounts TO postgres, anon, authenticated, service_role;

-- Backfill: migrate existing global cleared_amount values into the Garba event
-- Only for volunteers who have sales in the Garba event AND have a non-zero cleared_amount
INSERT INTO public.volunteer_event_cleared_amounts (volunteer_id, event_id, cleared_amount)
SELECT
    u.id AS volunteer_id,
    'aee0e3f4-f991-459a-9040-0d3efebc622c' AS event_id,
    u.cleared_amount
FROM public.users u
WHERE
    u.role IN ('volunteer', 'president', 'finance_director')
    AND u.cleared_amount IS NOT NULL
    AND u.cleared_amount > 0
    AND EXISTS (
        SELECT 1 FROM public.attendees a
        WHERE a.created_by = u.id
        AND a.event_id = 'aee0e3f4-f991-459a-9040-0d3efebc622c'
    )
ON CONFLICT (volunteer_id, event_id) DO NOTHING;
