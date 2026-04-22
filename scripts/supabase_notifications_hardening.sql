-- TarantulApp - Supabase hardening for enriched notifications
-- Safe to run multiple times (idempotent).

begin;

-- 1) Keep notification payload shape stable.
alter table if exists public.notifications
    alter column data set default '{}'::jsonb;

update public.notifications
set data = '{}'::jsonb
where data is null;

alter table if exists public.notifications
    alter column data set not null;

-- 2) Performance indexes used by API reads.
create index if not exists idx_notifications_user_created_desc
    on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
    on public.notifications (user_id, read_at)
    where read_at is null;

-- 3) Backfill route metadata for old notifications so navbar deep-links work.
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
set data = jsonb_set(coalesce(data, '{}'::jsonb), '{route}', to_jsonb('/account'::text), true)
where (coalesce(data, '{}'::jsonb) ? 'route') = false;

-- 4) Backfill fallback title/body for legacy rows with empty strings.
update public.notifications
set title = case
    when type = 'SPOOD_RECEIVED' then 'Nuevo Spood'
    when type = 'POST_COMMENT' then 'Nuevo comentario'
    when type = 'SEX_ID_VOTE' then 'Nuevo voto en tu caso'
    else 'Nueva notificacion'
end
where coalesce(btrim(title), '') = '';

update public.notifications
set body = case
    when type = 'SPOOD_RECEIVED' then 'Tu post recibio un Spood.'
    when type = 'POST_COMMENT' then 'Comentaron tu post en comunidad.'
    when type = 'SEX_ID_VOTE' then 'Un keeper voto en tu caso de Sex ID.'
    else 'Revisa tu bandeja de notificaciones.'
end
where coalesce(btrim(body), '') = '';

commit;
