-- =============================================
-- Japa Tracker - Supabase Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Profiles table (user info only, no target here)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  created_at timestamptz default now()
);

-- 2. Japas table (each user can track multiple japas)
create table public.japas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target integer not null check (target > 0),
  created_at timestamptz default now()
);

-- 3. Japa entries table (linked to a specific japa)
create table public.japa_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  japa_id uuid references public.japas(id) on delete cascade not null,
  count integer not null check (count > 0),
  entry_date date not null default current_date,
  created_at timestamptz default now()
);

-- Indexes
create index idx_japas_user on public.japas(user_id);
create index idx_japa_entries_user_date on public.japa_entries(user_id, entry_date);
create index idx_japa_entries_japa on public.japa_entries(japa_id);

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.japas enable row level security;
alter table public.japa_entries enable row level security;

-- Profiles: users can only access their own
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Japas: users can only access their own
create policy "Users can view own japas"
  on public.japas for select using (auth.uid() = user_id);
create policy "Users can insert own japas"
  on public.japas for insert with check (auth.uid() = user_id);
create policy "Users can update own japas"
  on public.japas for update using (auth.uid() = user_id);
create policy "Users can delete own japas"
  on public.japas for delete using (auth.uid() = user_id);

-- Japa entries: users can only access their own
create policy "Users can view own entries"
  on public.japa_entries for select using (auth.uid() = user_id);
create policy "Users can insert own entries"
  on public.japa_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own entries"
  on public.japa_entries for update using (auth.uid() = user_id);
create policy "Users can delete own entries"
  on public.japa_entries for delete using (auth.uid() = user_id);
