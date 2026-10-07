-- =====================================================================
-- 004  Storage buckets and policies
--
--  public-media    : course / gallery / instructor / news / story / logo
--                    images. Publicly viewable; only admins can write.
--  student-photos  : PRIVATE. Admin-only; shown via short-lived signed URLs.
--  Size & MIME limits are enforced by Supabase Storage itself, in addition
--  to the client-side checks.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media',   'public-media',   true,  2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('student-photos', 'student-photos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- public-media: anyone can fetch via public URL (bucket is public);
-- listing/writing is restricted to admins.
create policy "Admins list public media" on storage.objects
  for select to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));

create policy "Admins upload public media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and (select public.is_admin()));

create policy "Admins update public media" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()))
  with check (bucket_id = 'public-media' and (select public.is_admin()));

create policy "Admins delete public media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));

-- student-photos: admins only, for every operation.
create policy "Admins read student photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-photos' and (select public.is_admin()));

create policy "Admins upload student photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-photos' and (select public.is_admin()));

create policy "Admins update student photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-photos' and (select public.is_admin()))
  with check (bucket_id = 'student-photos' and (select public.is_admin()));

create policy "Admins delete student photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-photos' and (select public.is_admin()));
