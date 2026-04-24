-- Class forums foundation
-- Run once in Supabase SQL Editor

create table if not exists public.class_forums (
  id uuid primary key default gen_random_uuid(),
  group_name text not null references public.groups(name) on update cascade on delete cascade,
  title text not null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (group_name)
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.class_forums(id) on delete cascade,
  group_name text not null references public.groups(name) on update cascade on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  tag text null,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reply_at timestamptz null,
  deleted_at timestamptz null
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

alter table public.class_forums enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin is true
  );
$$;

create or replace function public.current_user_group_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select group_name
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.touch_forum_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_forum_reply_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.refresh_forum_thread_last_reply_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_threads
  set last_reply_at = (
    select max(created_at)
    from public.forum_replies
    where thread_id = coalesce(new.thread_id, old.thread_id)
      and deleted_at is null
  )
  where id = coalesce(new.thread_id, old.thread_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists forum_threads_touch_updated_at on public.forum_threads;
create trigger forum_threads_touch_updated_at
  before update on public.forum_threads
  for each row execute function public.touch_forum_thread_updated_at();

drop trigger if exists forum_replies_touch_updated_at on public.forum_replies;
create trigger forum_replies_touch_updated_at
  before update on public.forum_replies
  for each row execute function public.touch_forum_reply_updated_at();

drop trigger if exists forum_replies_refresh_thread_activity on public.forum_replies;
create trigger forum_replies_refresh_thread_activity
  after insert or update of deleted_at or delete on public.forum_replies
  for each row execute function public.refresh_forum_thread_last_reply_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'class_forums' and policyname = 'class_forums_select_own_group_or_admin'
  ) then
    create policy class_forums_select_own_group_or_admin
      on public.class_forums
      for select
      to authenticated
      using (
        is_active is true
        and (
          public.is_current_user_admin()
          or group_name = public.current_user_group_name()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'class_forums' and policyname = 'class_forums_insert_admin'
  ) then
    create policy class_forums_insert_admin
      on public.class_forums
      for insert
      to authenticated
      with check (public.is_current_user_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'class_forums' and policyname = 'class_forums_update_admin'
  ) then
    create policy class_forums_update_admin
      on public.class_forums
      for update
      to authenticated
      using (public.is_current_user_admin())
      with check (public.is_current_user_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_threads' and policyname = 'forum_threads_select_own_group_or_admin'
  ) then
    create policy forum_threads_select_own_group_or_admin
      on public.forum_threads
      for select
      to authenticated
      using (
        deleted_at is null
        and (
          public.is_current_user_admin()
          or group_name = public.current_user_group_name()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_threads' and policyname = 'forum_threads_insert_own_group_or_admin'
  ) then
    create policy forum_threads_insert_own_group_or_admin
      on public.forum_threads
      for insert
      to authenticated
      with check (
        author_id = auth.uid()
        and (
          public.is_current_user_admin()
          or group_name = public.current_user_group_name()
        )
        and exists (
          select 1
          from public.class_forums
          where class_forums.id = forum_id
            and class_forums.group_name = forum_threads.group_name
            and class_forums.is_active is true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_threads' and policyname = 'forum_threads_update_owner_or_admin'
  ) then
    create policy forum_threads_update_owner_or_admin
      on public.forum_threads
      for update
      to authenticated
      using (
        public.is_current_user_admin()
        or (
          author_id = auth.uid()
          and group_name = public.current_user_group_name()
        )
      )
      with check (
        public.is_current_user_admin()
        or (
          author_id = auth.uid()
          and group_name = public.current_user_group_name()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_replies' and policyname = 'forum_replies_select_own_group_or_admin'
  ) then
    create policy forum_replies_select_own_group_or_admin
      on public.forum_replies
      for select
      to authenticated
      using (
        deleted_at is null
        and exists (
          select 1
          from public.forum_threads
          where forum_threads.id = forum_replies.thread_id
            and forum_threads.deleted_at is null
            and (
              public.is_current_user_admin()
              or forum_threads.group_name = public.current_user_group_name()
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_replies' and policyname = 'forum_replies_insert_own_group_or_admin'
  ) then
    create policy forum_replies_insert_own_group_or_admin
      on public.forum_replies
      for insert
      to authenticated
      with check (
        author_id = auth.uid()
        and exists (
          select 1
          from public.forum_threads
          where forum_threads.id = forum_replies.thread_id
            and forum_threads.deleted_at is null
            and forum_threads.is_locked is false
            and (
              public.is_current_user_admin()
              or forum_threads.group_name = public.current_user_group_name()
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_replies' and policyname = 'forum_replies_update_owner_or_admin'
  ) then
    create policy forum_replies_update_owner_or_admin
      on public.forum_replies
      for update
      to authenticated
      using (
        public.is_current_user_admin()
        or author_id = auth.uid()
      )
      with check (
        public.is_current_user_admin()
        or author_id = auth.uid()
      );
  end if;
end $$;

create index if not exists class_forums_group_name_idx
  on public.class_forums (group_name);

create index if not exists forum_threads_forum_activity_idx
  on public.forum_threads (forum_id, is_pinned desc, (coalesce(last_reply_at, created_at)) desc)
  where deleted_at is null;

create index if not exists forum_threads_group_activity_idx
  on public.forum_threads (group_name, (coalesce(last_reply_at, created_at)) desc)
  where deleted_at is null;

create index if not exists forum_replies_thread_created_idx
  on public.forum_replies (thread_id, created_at)
  where deleted_at is null;
