-- Organize: user-owned Kanban boards + calendar events.
-- Single-user boards in v1; every table is user-scoped with the same RLS shape
-- as bible_annotations. `position` columns use fractional ordering (gap floats)
-- so a drag is a single-row UPDATE.

CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  emoji text,
  tint text,
  position double precision NOT NULL DEFAULT 1024,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  color text,
  wip_limit integer,
  position double precision NOT NULL DEFAULT 1024,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_color text,
  due_at timestamptz,
  all_day boolean NOT NULL DEFAULT true,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  position double precision NOT NULL DEFAULT 1024,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deep integration: a card can reference existing app content.
CREATE TABLE public.card_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('document', 'collection', 'generation', 'session')),
  target_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, kind, target_id)
);

CREATE TABLE public.organize_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'gold',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE public.card_tags (
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.organize_tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (card_id, tag_id)
);

-- Native calendar events (decision #4). Kept RFC-5545-compatible for a later
-- recurrence layer: clean starts_at/ends_at now, rrule column when needed.
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT 'gold',
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX boards_user_idx ON public.boards (user_id, position);
CREATE INDEX board_columns_board_idx ON public.board_columns (board_id, position);
CREATE INDEX cards_board_idx ON public.cards (board_id, column_id, position);
CREATE INDEX cards_due_idx ON public.cards (user_id, due_at) WHERE due_at IS NOT NULL;
CREATE INDEX card_links_card_idx ON public.card_links (card_id);
CREATE INDEX card_tags_tag_idx ON public.card_tags (tag_id);
CREATE INDEX events_user_range_idx ON public.events (user_id, starts_at);

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organize_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['boards','board_columns','cards','card_links','organize_tags','card_tags','events'] LOOP
    EXECUTE format('CREATE POLICY "Users can view their own %1$s" ON public.%1$I FOR SELECT USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "Users can create their own %1$s" ON public.%1$I FOR INSERT WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "Users can update their own %1$s" ON public.%1$I FOR UPDATE USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "Users can delete their own %1$s" ON public.%1$I FOR DELETE USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- Realtime: board surfaces refetch when any of these change.
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards, public.board_columns, public.cards, public.card_links, public.card_tags, public.organize_tags, public.events;
