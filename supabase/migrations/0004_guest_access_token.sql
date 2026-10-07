-- A guest buyer has no account: the secret token in their receipt link is what unlocks the download.
alter table public.ebook_purchase add column if not exists access_token text;
create index if not exists ebook_purchase_access_token_idx on public.ebook_purchase (access_token);
