-- TarantulApp launch event registration (Montreal)
-- Safe to run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.launch_event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name varchar(140) NOT NULL,
    email varchar(255) NOT NULL,
    phone varchar(40) NOT NULL,
    owns_tarantulas boolean NOT NULL,
    tarantula_count integer,
    will_attend boolean NOT NULL DEFAULT true,
    bring_collection_info boolean NOT NULL DEFAULT false,
    reminder_opt_in boolean NOT NULL DEFAULT false,
    newsletter_opt_in boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL,
    reservation_index integer,
    language varchar(8) NOT NULL DEFAULT 'en',
    source_path varchar(80),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT launch_event_registrations_status_chk
        CHECK (status IN ('RESERVED', 'WAITLIST')),
    CONSTRAINT launch_event_registrations_count_chk
        CHECK (tarantula_count IS NULL OR tarantula_count >= 0),
    CONSTRAINT launch_event_registrations_reservation_chk
        CHECK (
            (status = 'RESERVED' AND reservation_index IS NOT NULL AND reservation_index BETWEEN 1 AND 45)
            OR (status = 'WAITLIST' AND reservation_index IS NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_launch_event_registrations_email_lower
    ON public.launch_event_registrations ((lower(email)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_launch_event_registrations_reservation_index
    ON public.launch_event_registrations (reservation_index)
    WHERE reservation_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_launch_event_registrations_status_created
    ON public.launch_event_registrations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.launch_event_email_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES public.launch_event_registrations(id) ON DELETE CASCADE,
    event_key varchar(80) NOT NULL,
    sent_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT launch_event_email_events_unique UNIQUE (registration_id, event_key)
);

CREATE INDEX IF NOT EXISTS ix_launch_event_email_events_event_key
    ON public.launch_event_email_events (event_key, sent_at DESC);
