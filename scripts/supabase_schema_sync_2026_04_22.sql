-- TarantulApp / Supabase schema sync (2026-04-22)
-- Idempotent script: safe to run multiple times.
-- Purpose:
--   1) Harden notifications payload/query performance and deep-link routes.
--   2) Prepare device push tokens for enriched push-by-event delivery.

begin;

-- ---------------------------------------------------------------------------
-- Notifications hardening
-- ---------------------------------------------------------------------------

alter table if exists public.notifications
    alter column data set default '{}'::jsonb;

update public.notifications
set data = '{}'::jsonb
where data is null;

alter table if exists public.notifications
    alter column data set not null;

create index if not exists idx_notifications_user_created_desc
    on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
    on public.notifications (user_id, read_at)
    where read_at is null;

create index if not exists idx_notifications_type_created_desc
    on public.notifications (type, created_at desc);

update public.notifications
set data = jsonb_set(coalesce(data, '{}'::jsonb), '{route}', to_jsonb('/comunidad'::text), true)
where type in ('SPOOD_RECEIVED', 'POST_COMMENT')
  and (coalesce(data, '{}'::jsonb) ? 'route') = false;

update public.notifications
set data = jsonb_set(
        coalesce(data, '{}'::jsonb),
        '{route}',
        to_jsonb(('/sex-id/' || coalesce(data->>'caseId', ''))::text),
        true
    )
where type = 'SEX_ID_VOTE'
  and coalesce(data->>'caseId', '') <> ''
  and (coalesce(data, '{}'::jsonb) ? 'route') = false;

update public.notifications
set data = jsonb_set(
        coalesce(data, '{}'::jsonb),
        '{route}',
        to_jsonb('/account'::text),
        true
    )
where (coalesce(data, '{}'::jsonb) ? 'route') = false;

update public.notifications
set title = case
    when type = 'SPOOD_RECEIVED' then 'Nuevo Spood'
    when type = 'POST_COMMENT' then 'Nuevo comentario'
    when type = 'SEX_ID_VOTE' then 'Nuevo voto en tu caso'
    when type = 'REMINDER' then 'Recordatorio'
    else 'Nueva notificacion'
end
where coalesce(btrim(title), '') = '';

update public.notifications
set body = case
    when type = 'SPOOD_RECEIVED' then 'Tu post recibio un Spood.'
    when type = 'POST_COMMENT' then 'Comentaron tu post en comunidad.'
    when type = 'SEX_ID_VOTE' then 'Un keeper voto en tu caso de Sex ID.'
    when type = 'REMINDER' then 'Tienes un recordatorio pendiente.'
    else 'Revisa tu bandeja de notificaciones.'
end
where coalesce(btrim(body), '') = '';

-- ---------------------------------------------------------------------------
-- Push token hardening
-- ---------------------------------------------------------------------------

update public.device_push_tokens
set platform = lower(trim(platform))
where platform is not null
  and platform <> lower(trim(platform));

create index if not exists idx_device_push_tokens_user_enabled
    on public.device_push_tokens (user_id, enabled, last_seen_at desc);

create index if not exists idx_device_push_tokens_platform_enabled
    on public.device_push_tokens (platform, enabled);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'chk_device_push_tokens_platform'
    ) then
        alter table public.device_push_tokens
            add constraint chk_device_push_tokens_platform
            check (platform in ('android', 'ios'));
    end if;
end $$;

-- Optional cleanup for stale duplicates by (user_id, token) before unique index.
with ranked as (
    select
        id,
        row_number() over (
            partition by user_id, token
            order by last_seen_at desc nulls last, created_at desc nulls last, id
        ) as rn
    from public.device_push_tokens
)
delete from public.device_push_tokens d
using ranked r
where d.id = r.id
  and r.rn > 1;

create unique index if not exists uq_device_push_tokens_user_token
    on public.device_push_tokens (user_id, token);

commit;
