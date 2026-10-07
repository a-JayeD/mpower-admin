-- =====================================================================
-- Create the FIRST administrator (run once, after migrations 001–005).
--
-- 1. Supabase Dashboard → Authentication → Users → "Add user"
--    → "Create new user", enter the owner's email + a strong password,
--    and tick "Auto Confirm User".
-- 2. Replace the email below, then run this in the SQL Editor.
--
-- Later admins can be added from the dashboard: Settings → Administrators.
-- =====================================================================

insert into public.admins (id, email, full_name, role, is_active)
select u.id, lower(u.email), 'Owner', 'super_admin', true
from auth.users u
where lower(u.email) = lower('owner@example.com')   -- ← change this
on conflict (id) do update set role = 'super_admin', is_active = true;

-- Verify: should return one row
select id, email, role, is_active from public.admins;
