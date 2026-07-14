
CREATE OR REPLACE FUNCTION public.match_collection_chunks(
  query_embedding vector,
  target_user uuid,
  target_collection uuid DEFAULT NULL,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  item_id uuid,
  collection_id uuid,
  content text,
  similarity float
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.item_id,
    c.collection_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.collection_item_chunks c
  WHERE c.user_id = target_user
    AND c.embedding IS NOT NULL
    AND (target_collection IS NULL OR c.collection_id = target_collection)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_collection_chunks(vector, uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_collection_chunks(vector, uuid, uuid, int) TO authenticated, service_role;
