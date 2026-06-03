-- Migration 004 — Reactions, from_tema badge, announcements
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/ufysagkmcdbtsdhsatzn/sql

-- 1. Reaction type on likes (previously all were the same)
ALTER TABLE comunidad_likes
  ADD COLUMN IF NOT EXISTS reaction text NOT NULL DEFAULT 'like';

-- 2. Track posts created through the weekly-topic wizard
ALTER TABLE comunidad_posts
  ADD COLUMN IF NOT EXISTS from_tema boolean NOT NULL DEFAULT false;

-- 3. Teacher announcements (pinned banner above feed)
ALTER TABLE weekly_topic_override
  ADD COLUMN IF NOT EXISTS announcement text,
  ADD COLUMN IF NOT EXISTS announcement_active boolean NOT NULL DEFAULT false;
