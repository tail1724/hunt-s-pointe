
-- pgvector
create extension if not exists vector;

-- Embeddings on existing tables
alter table public.knowledge_entries add column if not exists embedding vector(1536);
alter table public.prompt_history    add column if not exists embedding vector(1536);

create index if not exists knowledge_entries_embedding_idx
  on public.knowledge_entries using hnsw (embedding vector_cosine_ops);
create index if not exists prompt_history_embedding_idx
  on public.prompt_history using hnsw (embedding vector_cosine_ops);

-- RAG match functions
create or replace function public.match_knowledge(
  query_embedding vector(1536), target_user uuid, match_count int default 5
) returns table (id uuid, title text, content_text text, similarity float)
language sql stable security definer set search_path = public as $$
  select id, title, content_text,
         1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_entries
  where user_id = target_user and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_past_prompts(
  query_embedding vector(1536), target_user uuid, match_count int default 5
) returns table (id uuid, seed text, output_openai text, similarity float)
language sql stable security definer set search_path = public as $$
  select id, seed, output_openai,
         1 - (embedding <=> query_embedding) as similarity
  from public.prompt_history
  where user_id = target_user and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ARTIFACTS
create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid,
  source_message_index int,
  kind text not null default 'prompt' check (kind in ('prompt','code','markdown')),
  title text not null default 'Untitled',
  content text not null default '',
  version int not null default 1,
  parent_artifact_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.artifacts enable row level security;
create policy "Users can CRUD own artifacts" on public.artifacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists artifacts_session_idx on public.artifacts(session_id, created_at desc);
create trigger artifacts_updated_at before update on public.artifacts
  for each row execute function public.update_updated_at_column();

-- USER_MEMORIES
create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fact text not null,
  source text default 'sentient',
  enabled boolean not null default true,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.user_memories enable row level security;
create policy "Users can CRUD own memories" on public.user_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_memories_user_idx on public.user_memories(user_id, last_used_at desc);

-- SHARED_SESSIONS
create table if not exists public.shared_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  slug text not null unique,
  redact_user_msgs boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.shared_sessions enable row level security;
create policy "Owners manage own shares" on public.shared_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Public can read by slug if not expired" on public.shared_sessions
  for select using (expires_at is null or expires_at > now());
create index if not exists shared_sessions_slug_idx on public.shared_sessions(slug);
