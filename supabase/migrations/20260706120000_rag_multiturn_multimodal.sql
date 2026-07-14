
-- =====================================================
-- Ezra RAG Pipeline — Phase 2 schema
-- Multi-turn memory · chunk enrichment (HyQE, tags) ·
-- multimodal chunks · scripture cross-reference graph ·
-- enrichment queue · evaluation runs · chat uploads
-- =====================================================

-- 1) Rolling per-session conversation memory.
--    One row per partner_session; the utility model keeps `summary` and
--    `facts` current so long chats stop resending the whole transcript.
CREATE TABLE public.session_memories (
  session_id uuid PRIMARY KEY REFERENCES public.partner_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  summary text NOT NULL DEFAULT '',
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  turns_covered int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_memories TO authenticated;
GRANT ALL ON public.session_memories TO service_role;

ALTER TABLE public.session_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session memories"
  ON public.session_memories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2) Chunk enrichment columns.
--    chunk_metadata: tags, entities, doc_type, one-line summary (jsonb doc store).
--    parent_id: multi-granularity — retrieval hits small chunks, context
--    expansion returns the larger parent chunk when budget allows.
--    modality: text | image | chart | audio | video (what the chunk describes).
ALTER TABLE public.collection_item_chunks
  ADD COLUMN chunk_metadata jsonb,
  ADD COLUMN parent_id uuid REFERENCES public.collection_item_chunks(id) ON DELETE SET NULL,
  ADD COLUMN modality text NOT NULL DEFAULT 'text';

CREATE INDEX collection_item_chunks_parent_idx ON public.collection_item_chunks(parent_id);
CREATE INDEX collection_item_chunks_metadata_idx ON public.collection_item_chunks USING gin (chunk_metadata);


-- 3) Hypothetical questions per chunk (HyQE).
--    "What question does this chunk answer?" — embedded and used as a third
--    retrieval arm: user query vs hypothetical questions.
CREATE TABLE public.chunk_hypothetical_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL REFERENCES public.collection_item_chunks(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  collection_id uuid NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunk_hypothetical_questions TO authenticated;
GRANT ALL ON public.chunk_hypothetical_questions TO service_role;

ALTER TABLE public.chunk_hypothetical_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hyq"
  ON public.chunk_hypothetical_questions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX chunk_hyq_chunk_idx ON public.chunk_hypothetical_questions(chunk_id);
CREATE INDEX chunk_hyq_user_idx ON public.chunk_hypothetical_questions(user_id);
CREATE INDEX chunk_hyq_embedding_idx
  ON public.chunk_hypothetical_questions USING hnsw (embedding vector_cosine_ops);


-- 4) Entity edges extracted from chunks (graph layer, no new infra).
CREATE TABLE public.chunk_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL REFERENCES public.collection_item_chunks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,   -- person | place | verse_ref | topic | org
  entity_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunk_entities TO authenticated;
GRANT ALL ON public.chunk_entities TO service_role;

ALTER TABLE public.chunk_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chunk entities"
  ON public.chunk_entities
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX chunk_entities_chunk_idx ON public.chunk_entities(chunk_id);
CREATE INDEX chunk_entities_value_idx ON public.chunk_entities(entity_type, entity_value);


-- 5) Scripture cross-reference graph (public data, e.g. Treasury of
--    Scripture Knowledge). 1-hop traversal enriches passage retrieval.
CREATE TABLE public.verse_xrefs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_book text NOT NULL,
  from_chapter int NOT NULL,
  from_verse int NOT NULL,
  to_book text NOT NULL,
  to_chapter int NOT NULL,
  to_verse_start int NOT NULL,
  to_verse_end int,
  votes int NOT NULL DEFAULT 0
);

GRANT SELECT ON public.verse_xrefs TO authenticated;
GRANT ALL ON public.verse_xrefs TO service_role;

ALTER TABLE public.verse_xrefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read verse xrefs"
  ON public.verse_xrefs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX verse_xrefs_from_idx ON public.verse_xrefs(from_book, from_chapter, from_verse);


-- 6) Enrichment queue — ingest enqueues, the collection-enrich worker drains
--    in bounded batches so edge-function timeouts never block ingestion.
CREATE TABLE public.enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.collection_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | running | done | error
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrichment_queue TO authenticated;
GRANT ALL ON public.enrichment_queue TO service_role;

ALTER TABLE public.enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own enrichment jobs"
  ON public.enrichment_queue
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX enrichment_queue_status_idx ON public.enrichment_queue(status, created_at);


-- 7) Evaluation runs (RAGAS-style harness writes here).
CREATE TABLE public.rag_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text NOT NULL,
  pipeline_version text NOT NULL,
  dataset text NOT NULL,
  metrics jsonb NOT NULL,
  per_conversation jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rag_eval_runs TO authenticated;
GRANT ALL ON public.rag_eval_runs TO service_role;

ALTER TABLE public.rag_eval_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read eval runs"
  ON public.rag_eval_runs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone signed in can insert eval runs"
  ON public.rag_eval_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- 8) HyQ vector match RPC (mirrors match_collection_chunks).
CREATE OR REPLACE FUNCTION public.match_chunk_hyq(
  query_embedding vector(1536),
  target_user uuid,
  target_collection uuid,
  match_count int
)
RETURNS TABLE (
  chunk_id uuid,
  item_id uuid,
  collection_id uuid,
  question text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.chunk_id,
    h.item_id,
    h.collection_id,
    h.question,
    1 - (h.embedding <=> query_embedding) AS similarity
  FROM public.chunk_hypothetical_questions h
  WHERE h.user_id = target_user
    AND h.embedding IS NOT NULL
    AND (target_collection IS NULL OR h.collection_id = target_collection)
  ORDER BY h.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_chunk_hyq(vector, uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_chunk_hyq(vector, uuid, uuid, int) TO authenticated, service_role;


-- 9) Private bucket for in-chat uploads (images, audio, video, documents).
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own chat uploads"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
