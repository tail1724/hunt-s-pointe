
-- =====================================================
-- Mary RAG Pipeline — Phase 1 schema
-- =====================================================

-- 1) Per-user chunked + embedded collection items
CREATE TABLE public.collection_item_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.collection_items(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL,
  user_id uuid NOT NULL,
  chunk_index int NOT NULL,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'prose',
  token_count int,
  embedding vector(1536),
  pipeline_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_item_chunks TO authenticated;
GRANT ALL ON public.collection_item_chunks TO service_role;

ALTER TABLE public.collection_item_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chunks"
  ON public.collection_item_chunks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX collection_item_chunks_item_idx ON public.collection_item_chunks(item_id);
CREATE INDEX collection_item_chunks_collection_idx ON public.collection_item_chunks(collection_id);
CREATE INDEX collection_item_chunks_user_idx ON public.collection_item_chunks(user_id);
CREATE INDEX collection_item_chunks_embedding_idx
  ON public.collection_item_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX collection_item_chunks_fts_idx
  ON public.collection_item_chunks USING gin (to_tsvector('english', content));


-- 2) Tier-1 embedding cache (deterministic from rewritten query text)
CREATE TABLE public.query_embedding_cache (
  query_hash text PRIMARY KEY,
  model text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.query_embedding_cache TO authenticated;
GRANT ALL ON public.query_embedding_cache TO service_role;

ALTER TABLE public.query_embedding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read embedding cache"
  ON public.query_embedding_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone signed in can write embedding cache"
  ON public.query_embedding_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- 3) Lazy-embedded Bible verses (public scripture text)
CREATE TABLE public.bible_verse_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation text NOT NULL,
  book text NOT NULL,
  chapter int NOT NULL,
  verse int NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (translation, book, chapter, verse)
);

GRANT SELECT ON public.bible_verse_embeddings TO authenticated;
GRANT ALL ON public.bible_verse_embeddings TO service_role;

ALTER TABLE public.bible_verse_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read bible embeddings"
  ON public.bible_verse_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX bible_verse_embeddings_translation_idx ON public.bible_verse_embeddings(translation);
CREATE INDEX bible_verse_embeddings_embedding_idx
  ON public.bible_verse_embeddings USING hnsw (embedding vector_cosine_ops);


-- 4) Per-query retrieval telemetry
CREATE TABLE public.rag_query_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  collection_id uuid,
  raw_query text,
  rewritten_query text,
  retrieved_chunk_ids uuid[],
  rerank_order int[],
  included_web boolean NOT NULL DEFAULT false,
  included_bibles boolean NOT NULL DEFAULT false,
  cache_hit_embedding boolean NOT NULL DEFAULT false,
  latency_ms_total int,
  latency_breakdown jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rag_query_events TO authenticated;
GRANT ALL ON public.rag_query_events TO service_role;

ALTER TABLE public.rag_query_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rag events"
  ON public.rag_query_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rag events"
  ON public.rag_query_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX rag_query_events_user_ts_idx ON public.rag_query_events(user_id, ts DESC);
