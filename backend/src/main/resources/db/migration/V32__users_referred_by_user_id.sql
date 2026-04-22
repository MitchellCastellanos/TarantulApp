-- Ensure referral column exists (some deployments missed V30 line 53 or V30 failed mid-file).
alter table users add column if not exists referred_by_user_id uuid null references users(id) on delete set null;
