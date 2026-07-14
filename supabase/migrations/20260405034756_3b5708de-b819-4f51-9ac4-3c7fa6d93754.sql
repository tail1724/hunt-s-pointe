
create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  content_type text not null default 'text',
  content_text text,
  file_path text,
  file_name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_entries enable row level security;

create policy "Users can CRUD own knowledge"
  on public.knowledge_entries for all
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger update_knowledge_updated_at
  before update on public.knowledge_entries
  for each row execute function public.update_updated_at_column();
