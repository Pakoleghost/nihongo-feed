-- Study Kana Sprint leaderboard
-- Run once in Supabase SQL Editor

create table if not exists public.study_kana_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  best_score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.study_kana_scores enable row level security;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'study_kana_scores_mode_check'
  ) then
    alter table public.study_kana_scores
      drop constraint study_kana_scores_mode_check;
  end if;

  alter table public.study_kana_scores
    add constraint study_kana_scores_mode_check
    check (
      mode in (
        'hiragana',
        'katakana',
        'mixed',
        'vk:l1_2',
        'vk:l3_4',
        'vk:l5_6',
        'vk:l7_8',
        'vk:l9_10',
        'vk:l11_12'
      )
    );
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_kana_scores' and policyname = 'study_kana_scores_select_all'
  ) then
    create policy study_kana_scores_select_all
      on public.study_kana_scores
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_kana_scores' and policyname = 'study_kana_scores_insert_own'
  ) then
    create policy study_kana_scores_insert_own
      on public.study_kana_scores
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_kana_scores' and policyname = 'study_kana_scores_update_own'
  ) then
    create policy study_kana_scores_update_own
      on public.study_kana_scores
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists study_kana_scores_mode_score_idx
  on public.study_kana_scores (mode, best_score desc, updated_at asc);
