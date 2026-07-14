
-- ===== Collections: context bundles for Mary & Write =====

-- 1. collections
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'indigo',
  icon text NOT NULL DEFAULT 'FolderHeart',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_owner_all" ON public.collections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX collections_user_idx ON public.collections(user_id, created_at DESC);

-- 2. collection_items
CREATE TABLE public.collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('text','file','image','link')),
  title text,
  body_text text,
  source_url text,
  storage_path text,
  mime_type text,
  byte_size integer,
  char_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('pending','ready','error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT ALL ON public.collection_items TO service_role;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_items_owner_all" ON public.collection_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX collection_items_collection_idx ON public.collection_items(collection_id, created_at DESC);

-- 3. collection_artifacts
CREATE TABLE public.collection_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (artifact_type IN ('mary_session','document','image')),
  artifact_id uuid NOT NULL,
  preview_title text,
  preview_snippet text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, artifact_type, artifact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_artifacts TO authenticated;
GRANT ALL ON public.collection_artifacts TO service_role;
ALTER TABLE public.collection_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_artifacts_owner_all" ON public.collection_artifacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX collection_artifacts_collection_idx ON public.collection_artifacts(collection_id, created_at DESC);

-- 4. active_collection_selection (per user × surface)
CREATE TABLE public.active_collection_selection (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface text NOT NULL CHECK (surface IN ('mary','write')),
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, surface)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_collection_selection TO authenticated;
GRANT ALL ON public.active_collection_selection TO service_role;
ALTER TABLE public.active_collection_selection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active_collection_owner_all" ON public.active_collection_selection
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. updated_at triggers
CREATE TRIGGER collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER collection_items_updated_at BEFORE UPDATE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Archive existing Knowledge Base entries (hide from UI, preserve data)
ALTER TABLE public.knowledge_entries ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
UPDATE public.knowledge_entries SET is_hidden = true WHERE is_hidden = false;

-- 7. Storage policies on the 'collections' bucket
-- Path convention: {user_id}/{collection_id}/{item_id}/{filename}
CREATE POLICY "collections_bucket_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'collections' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "collections_bucket_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'collections' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "collections_bucket_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'collections' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "collections_bucket_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'collections' AND auth.uid()::text = (storage.foldername(name))[1]);
