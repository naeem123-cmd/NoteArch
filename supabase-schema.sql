-- Run this in Supabase -> SQL Editor -> New query -> Run
-- If you already ran the earlier version, just run the "alter table" and
-- storage bucket sections below -- they're safe to run again.

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

-- if you already had the notes table from before, this adds the new columns:
alter table notes add column if not exists attendees text default '';
alter table notes add column if not exists image_url text default '';

alter table projects enable row level security;
alter table notes enable row level security;

drop policy if exists "public read projects" on projects;
drop policy if exists "public write projects" on projects;
drop policy if exists "public read notes" on notes;
drop policy if exists "public write notes" on notes;
drop policy if exists "public update notes" on notes;
drop policy if exists "public delete notes" on notes;

create policy "public read projects" on projects for select using (true);
create policy "public write projects" on projects for insert with check (true);
create policy "public read notes" on notes for select using (true);
create policy "public write notes" on notes for insert with check (true);
create policy "public update notes" on notes for update using (true);
create policy "public delete notes" on notes for delete using (true);

-- Storage bucket for site/material photos attached to notes.
-- Go to Supabase -> Storage -> "Create a new bucket" -> name it exactly: note-photos
-- Toggle "Public bucket" ON, then run the policies below.

insert into storage.buckets (id, name, public)
values ('note-photos', 'note-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read note photos" on storage.objects;
drop policy if exists "public upload note photos" on storage.objects;

create policy "public read note photos" on storage.objects
  for select using (bucket_id = 'note-photos');

create policy "public upload note photos" on storage.objects
  for insert with check (bucket_id = 'note-photos');
