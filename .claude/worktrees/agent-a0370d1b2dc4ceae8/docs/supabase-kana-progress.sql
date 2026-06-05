-- Kana progress persistence
-- Run once in Supabase SQL Editor
-- Stores each user's full KanaProgressMap as JSONB (one row per user)

create table if not exists public.kana_progress (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  progress  jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.kana_progress enable row level security;

-- Users can only read/write their own row
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kana_progress' and policyname = 'kana_progress_select_own'
  ) then
    create policy kana_progress_select_own on public.kana_progress
      for select to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kana_progress' and policyname = 'kana_progress_insert_own'
  ) then
    create policy kana_progress_insert_own on public.kana_progress
      for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kana_progress' and policyname = 'kana_progress_update_own'
  ) then
    create policy kana_progress_update_own on public.kana_progress
      for update to authenticated using (auth.uid() = user_id);
  end if;
end $$;
