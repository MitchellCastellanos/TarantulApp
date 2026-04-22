-- Raise reserved seat range to 50; add table for post-sold-out email interest only.

ALTER TABLE public.launch_event_registrations
    DROP CONSTRAINT IF EXISTS launch_event_registrations_reservation_chk;

ALTER TABLE public.launch_event_registrations
    ADD CONSTRAINT launch_event_registrations_reservation_chk CHECK (
        (status = 'RESERVED' AND reservation_index IS NOT NULL AND reservation_index BETWEEN 1 AND 50)
        OR (status = 'WAITLIST' AND reservation_index IS NULL)
    );

CREATE TABLE IF NOT EXISTS public.launch_event_future_interest (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email character varying(255) NOT NULL,
    language character varying(8) NOT NULL DEFAULT 'en',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Expression UNIQUE must be an index in PostgreSQL (not a table UNIQUE constraint).
CREATE UNIQUE INDEX IF NOT EXISTS ux_launch_event_future_interest_email_lower
    ON public.launch_event_future_interest (lower(email));

CREATE INDEX IF NOT EXISTS ix_launch_event_future_interest_created
    ON public.launch_event_future_interest (created_at DESC);
