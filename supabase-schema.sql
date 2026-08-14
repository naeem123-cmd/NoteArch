-- Run this in Supabase -> SQL Editor -> New query -> Run
-- Safe to re-run if you already ran an earlier version.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  transcript text not null,
  summary text default '',
  decisions jsonb default '[]',
  action_items jsonb default '[]',
  tags jsonb default '[]',
  attendees text default '',
  image_url text default '',
  created_at timestamptz not null default now()
);

alter table notes add column if not exists attendees text default '';
alter table notes add column if not exists image_url text default '';

-- One row per signed-in person. project_id = NULL means full access
-- (your in-house team). project_id set to a specific project means that
-- account can only see/write notes for that one project (a client).

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Every new sign-up automatically gets a profile row with full access
-- (project_id = NULL). You then manually restrict client accounts
-- afterwards -- see the note at the bottom of this file.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, project_id) values (new.id, null);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table projects enable row level security;
alter table notes enable row level security;
alter table profiles enable row level security;

drop policy if exists "public read projects" on projects;
drop policy if exists "public write projects" on projects;
drop policy if exists "public read notes" on notes;
drop policy if exists "public write notes" on notes;
drop policy if exists "public update notes" on notes;
drop policy if exists "public delete notes" on notes;
drop policy if exists "auth read projects" on projects;
drop policy if exists "auth write projects" on projects;
drop policy if exists "auth read notes" on notes;
drop policy if exists "auth write notes" on notes;
drop policy if exists "auth update notes" on notes;
drop policy if exists "auth delete notes" on notes;
drop policy if exists "scoped read projects" on projects;
drop policy if exists "scoped write projects" on projects;
drop policy if exists "scoped read notes" on notes;
drop policy if exists "scoped write notes" on notes;
drop policy if exists "scoped update notes" on notes;
drop policy if exists "scoped delete notes" on notes;
drop policy if exists "read own profile" on profiles;

-- A person only sees a project if they have full access (project_id is
-- null) or that project is the one they're scoped to.
create policy "scoped read projects" on projects for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and (p.project_id is null or p.project_id = projects.id))
);
-- Only full-access (team) accounts can create new projects.
create policy "scoped write projects" on projects for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.project_id is null)
);

create policy "scoped read notes" on notes for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and (p.project_id is null or p.project_id = notes.project_id))
);
create policy "scoped write notes" on notes for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and (p.project_id is null or p.project_id = notes.project_id))
);
create policy "scoped update notes" on notes for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and (p.project_id is null or p.project_id = notes.project_id))
);
create policy "scoped delete notes" on notes for delete using (
  exists (select 1 from profiles p where p.id = auth.uid() and (p.project_id is null or p.project_id = notes.project_id))
);

create policy "read own profile" on profiles for select using (id = auth.uid());

-- Storage bucket for site/material photos.
-- If you haven't already: Supabase -> Storage -> Create a new bucket ->
-- name it exactly "note-photos" -> toggle "Public bucket" ON.

insert into storage.buckets (id, name, public)
values ('note-photos', 'note-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read note photos" on storage.objects;
drop policy if exists "public upload note photos" on storage.objects;
drop policy if exists "auth upload note photos" on storage.objects;

create policy "public read note photos" on storage.objects
  for select using (bucket_id = 'note-photos');

create policy "auth upload note photos" on storage.objects
  for insert with check (bucket_id = 'note-photos' and auth.role() = 'authenticated');

-- ============================================================
-- AFTER the client signs up once (they'll see nothing until you do this):
--   1. Table Editor -> profiles -> find their row (matches their email
--      via the "id" column -- cross-check in Authentication -> Users)
--   2. Table Editor -> projects -> copy the id of "Trump Tower"
--   3. Edit the client's profiles row -> paste that id into project_id
--   4. They'll now only ever see Trump Tower, and your team still sees
--      everything (their own profiles.project_id stays NULL)
-- ============================================================
