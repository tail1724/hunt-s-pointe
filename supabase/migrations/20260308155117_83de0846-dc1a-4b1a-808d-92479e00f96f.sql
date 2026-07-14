
-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Context Stacks table (unified for all 6 layers)
CREATE TABLE public.context_stacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layer TEXT NOT NULL CHECK (layer IN ('visual', 'environmental', 'motion', 'sonic', 'narrative', 'saas_params')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  positive_keywords TEXT[] NOT NULL DEFAULT '{}',
  negative_keywords TEXT[] NOT NULL DEFAULT '{}',
  technical_params JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.context_stacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Context stacks readable by authenticated" ON public.context_stacks FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_stacks_layer ON public.context_stacks(layer);
CREATE INDEX idx_stacks_category ON public.context_stacks(category);

-- Personas table
CREATE TABLE public.personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  locked_stacks UUID[] NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own personas" ON public.personas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prompt history
CREATE TABLE public.prompt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed TEXT NOT NULL,
  selected_stacks UUID[] NOT NULL DEFAULT '{}',
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'creative' CHECK (mode IN ('literal', 'creative', 'stylized')),
  granularity INT NOT NULL DEFAULT 50 CHECK (granularity BETWEEN 0 AND 100),
  variables JSONB DEFAULT '{}',
  output_midjourney TEXT,
  output_video TEXT,
  output_audio TEXT,
  output_openai TEXT,
  negative_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own history" ON public.prompt_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
