-- Replies / comments for comunidad posts
-- Run once in Supabase SQL Editor

create table if not exists public.comunidad_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.comunidad_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) >= 1 and char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists comunidad_comments_post_id_idx on public.comunidad_comments(post_id);

alter table public.comunidad_comments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
    and tablename = 'comunidad_comments' and policyname = 'comments_select_all'
  ) then
    create policy comments_select_all on public.comunidad_comments
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
    and tablename = 'comunidad_comments' and policyname = 'comments_insert_own'
  ) then
    create policy comments_insert_own on public.comunidad_comments
      for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
    and tablename = 'comunidad_comments' and policyname = 'comments_delete_own'
  ) then
    create policy comments_delete_own on public.comunidad_comments
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;
