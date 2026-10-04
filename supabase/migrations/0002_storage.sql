-- File storage: covers / product photos are public, ebook PDFs are private
-- (customers only ever get short-lived signed links from the generateEbookDownloadUrl function).
insert into storage.buckets (id, name, public) values ('public-files', 'public-files', true), ('private-files', 'private-files', false)
on conflict (id) do nothing;

create policy "admin manages site files" on storage.objects for all to authenticated
  using (bucket_id in ('public-files', 'private-files') and public.is_admin())
  with check (bucket_id in ('public-files', 'private-files') and public.is_admin());
