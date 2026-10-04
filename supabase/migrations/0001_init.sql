-- Dark Network on Supabase: one table per content type, with row level security.
-- Record ids are text so records copied from Base44 keep their ids and their cross references.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_date timestamptz not null default now()
);
alter table public.profiles enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());

-- every new account gets a profile row; the role can only be changed from the Supabase dashboard / SQL
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_date() returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

-- BibleStudy
create table public.bible_study (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  title text,
  slug text,
  category text default 'Old Testament',
  excerpt text,
  content text,
  hero_image text,
  bible_verses text,
  historical_context text,
  conclusion text,
  related_video_id text,
  related_ebook_id text,
  related_product_ids jsonb,
  seo_title text,
  meta_description text,
  og_image text,
  status text default 'published',
  featured boolean default false
);
create unique index bible_study_slug_key on public.bible_study (slug);
create trigger bible_study_touch before update on public.bible_study for each row execute function public.touch_updated_date();
alter table public.bible_study enable row level security;
create policy "public read" on public.bible_study for select using (true);
create policy "admin insert" on public.bible_study for insert with check (public.is_admin());
create policy "admin update" on public.bible_study for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.bible_study for delete using (public.is_admin());

-- BlogPost
create table public.blog_post (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  title text,
  slug text,
  excerpt text,
  content text,
  hero_image text,
  category text,
  seo_title text,
  meta_description text,
  status text default 'published'
);
create unique index blog_post_slug_key on public.blog_post (slug);
create trigger blog_post_touch before update on public.blog_post for each row execute function public.touch_updated_date();
alter table public.blog_post enable row level security;
create policy "public read" on public.blog_post for select using (true);
create policy "admin insert" on public.blog_post for insert with check (public.is_admin());
create policy "admin update" on public.blog_post for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.blog_post for delete using (public.is_admin());

-- ChatConversation
create table public.chat_conversation (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  user_id text,
  guest_key text,
  visitor_name text,
  last_message_at timestamptz,
  last_message_preview text,
  unread_for_admin boolean default false,
  status text default 'open'
);
create trigger chat_conversation_touch before update on public.chat_conversation for each row execute function public.touch_updated_date();
alter table public.chat_conversation enable row level security;
create policy "admin all" on public.chat_conversation for all using (public.is_admin()) with check (public.is_admin());

-- ChatMessage
create table public.chat_message (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  conversation_id text,
  sender_role text default 'visitor',
  sender_user_id text,
  sender_name text,
  body text,
  read_by_admin boolean default false,
  read_by_visitor boolean default false
);
create trigger chat_message_touch before update on public.chat_message for each row execute function public.touch_updated_date();
alter table public.chat_message enable row level security;
create policy "admin all" on public.chat_message for all using (public.is_admin()) with check (public.is_admin());

-- Ebook
create table public.ebook (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  title text,
  slug text,
  subtitle text,
  description text,
  price numeric default 0,
  original_price numeric,
  cover_image text,
  what_you_learn jsonb,
  preview_images jsonb,
  who_for text,
  file_url text,
  secure_file_uri text,
  bonus_title text,
  bonus_description text,
  bonus_cover_image text,
  bonus_secure_file_uri text,
  lemon_squeezy_variant_id text,
  related_ebook_ids jsonb,
  edition_type text default 'auto',
  related_video_id text,
  related_study_ids jsonb,
  reviews jsonb,
  faq jsonb,
  seo_title text,
  meta_description text,
  sort_order numeric default 0,
  status text default 'published',
  featured boolean default false
);
create unique index ebook_slug_key on public.ebook (slug);
create trigger ebook_touch before update on public.ebook for each row execute function public.touch_updated_date();
alter table public.ebook enable row level security;
create policy "public read" on public.ebook for select using (true);
create policy "admin insert" on public.ebook for insert with check (public.is_admin());
create policy "admin update" on public.ebook for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.ebook for delete using (public.is_admin());

-- EbookPurchase
create table public.ebook_purchase (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  user_id text,
  ebook_id text,
  provider text default 'lemon_squeezy',
  order_id text,
  provider_order_id text,
  provider_variant_id text,
  customer_email text,
  amount numeric,
  currency text default 'USD',
  purchase_date timestamptz,
  payment_status text default 'pending',
  download_access boolean default false,
  description text
);
create trigger ebook_purchase_touch before update on public.ebook_purchase for each row execute function public.touch_updated_date();
alter table public.ebook_purchase enable row level security;
create policy "read own or admin" on public.ebook_purchase for select using (user_id = auth.uid()::text or public.is_admin());
create policy "admin insert" on public.ebook_purchase for insert with check (public.is_admin());
create policy "admin update" on public.ebook_purchase for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.ebook_purchase for delete using (public.is_admin());

-- FreeResource
create table public.free_resource (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  title text,
  slug text,
  description text,
  cover_image text,
  download_url text,
  resource_type text default 'Bible Study PDF',
  requires_email boolean default true,
  seo_title text,
  meta_description text,
  sort_order numeric default 0,
  status text default 'published'
);
create unique index free_resource_slug_key on public.free_resource (slug);
create trigger free_resource_touch before update on public.free_resource for each row execute function public.touch_updated_date();
alter table public.free_resource enable row level security;
create policy "public read" on public.free_resource for select using (true);
create policy "admin insert" on public.free_resource for insert with check (public.is_admin());
create policy "admin update" on public.free_resource for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.free_resource for delete using (public.is_admin());

-- HeroSlide
create table public.hero_slide (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  image text,
  eyebrow text,
  title text,
  description text,
  cta1_label text,
  cta1_url text,
  cta2_label text,
  cta2_url text,
  sort_order numeric default 0,
  status text default 'published'
);
create trigger hero_slide_touch before update on public.hero_slide for each row execute function public.touch_updated_date();
alter table public.hero_slide enable row level security;
create policy "public read" on public.hero_slide for select using (true);
create policy "admin insert" on public.hero_slide for insert with check (public.is_admin());
create policy "admin update" on public.hero_slide for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.hero_slide for delete using (public.is_admin());

-- MembershipStat
create table public.membership_stat (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  value text,
  label text,
  sort_order numeric default 0,
  description text
);
create trigger membership_stat_touch before update on public.membership_stat for each row execute function public.touch_updated_date();
alter table public.membership_stat enable row level security;
create policy "public read" on public.membership_stat for select using (true);
create policy "admin insert" on public.membership_stat for insert with check (public.is_admin());
create policy "admin update" on public.membership_stat for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.membership_stat for delete using (public.is_admin());

-- Product
create table public.product (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  title text,
  slug text,
  category text default 'Apparel',
  price numeric default 0,
  original_price numeric,
  sort_order numeric default 0,
  images jsonb,
  description text,
  bible_inspiration text,
  story_behind_design text,
  product_info text,
  size_info text,
  shipping_info text,
  spring_url text,
  related_study_id text,
  related_ebook_id text,
  seo_title text,
  meta_description text,
  status text default 'published',
  featured boolean default false
);
create unique index product_slug_key on public.product (slug);
create trigger product_touch before update on public.product for each row execute function public.touch_updated_date();
alter table public.product enable row level security;
create policy "public read" on public.product for select using (true);
create policy "admin insert" on public.product for insert with check (public.is_admin());
create policy "admin update" on public.product for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.product for delete using (public.is_admin());

-- SiteContent
create table public.site_content (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  section_key text,
  title text,
  description text,
  cta_label text,
  cta_url text
);
create trigger site_content_touch before update on public.site_content for each row execute function public.touch_updated_date();
alter table public.site_content enable row level security;
create policy "public read" on public.site_content for select using (true);
create policy "admin insert" on public.site_content for insert with check (public.is_admin());
create policy "admin update" on public.site_content for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.site_content for delete using (public.is_admin());

-- Subscriber
create table public.subscriber (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  email text,
  source text default 'Homepage',
  description text
);
create trigger subscriber_touch before update on public.subscriber for each row execute function public.touch_updated_date();
alter table public.subscriber enable row level security;
create policy "anyone adds" on public.subscriber for insert with check (true);
create policy "admin reads" on public.subscriber for select using (public.is_admin());
create policy "admin update" on public.subscriber for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.subscriber for delete using (public.is_admin());

-- Testimonial
create table public.testimonial (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  rating numeric default 5,
  text text,
  author text,
  location text,
  verified boolean default false,
  sort_order numeric default 0
);
create trigger testimonial_touch before update on public.testimonial for each row execute function public.touch_updated_date();
alter table public.testimonial enable row level security;
create policy "public read" on public.testimonial for select using (true);
create policy "admin insert" on public.testimonial for insert with check (public.is_admin());
create policy "admin update" on public.testimonial for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.testimonial for delete using (public.is_admin());

-- Video
create table public.video (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id text,
  title text,
  slug text,
  youtube_id text,
  category text default 'Latest',
  description text,
  thumbnail_url text,
  related_study_id text,
  related_ebook_id text,
  related_product_ids jsonb,
  seo_title text,
  meta_description text,
  status text default 'published',
  featured boolean default false,
  popular boolean default false
);
create unique index video_slug_key on public.video (slug);
create trigger video_touch before update on public.video for each row execute function public.touch_updated_date();
alter table public.video enable row level security;
create policy "public read" on public.video for select using (true);
create policy "admin insert" on public.video for insert with check (public.is_admin());
create policy "admin update" on public.video for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.video for delete using (public.is_admin());

-- indexes for the lookups the site does
create index ebook_purchase_user_idx on public.ebook_purchase (user_id);
create index ebook_purchase_order_idx on public.ebook_purchase (provider, provider_order_id);
create index ebook_purchase_email_idx on public.ebook_purchase (customer_email);
create index chat_message_conversation_idx on public.chat_message (conversation_id, created_date);
create index chat_conversation_guest_idx on public.chat_conversation (guest_key);

