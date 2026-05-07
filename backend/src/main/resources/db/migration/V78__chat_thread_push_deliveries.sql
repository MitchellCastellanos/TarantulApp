-- Audit trail for marketplace deal push notifications (FCM acceptance ack from device).

create extension if not exists pgcrypto;

create table if not exists chat_thread_push_deliveries (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references chat_threads(id) on delete cascade,
    notification_id uuid references notifications(id) on delete set null,
    recipient_user_id uuid not null references users(id) on delete cascade,
    notification_type varchar(40) not null,
    fcm_success_count int not null default 0,
    sent_at timestamptz not null default now(),
    received_ack_at timestamptz
);

create index if not exists idx_chat_thread_push_deliveries_thread_sent
    on chat_thread_push_deliveries(thread_id, sent_at desc);

create index if not exists idx_chat_thread_push_deliveries_recipient
    on chat_thread_push_deliveries(recipient_user_id, sent_at desc);
