ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS published_name TEXT,
  ADD COLUMN IF NOT EXISTS published_description TEXT,
  ADD COLUMN IF NOT EXISTS published_icon TEXT,
  ADD COLUMN IF NOT EXISTS published_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_payload TEXT,
  ADD COLUMN IF NOT EXISTS published_display_order INTEGER,
  ADD COLUMN IF NOT EXISTS published_parent_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_action_type TEXT,
  ADD COLUMN IF NOT EXISTS published_auto_send BOOLEAN,
  ADD COLUMN IF NOT EXISTS published_prompt_text TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.skills
SET
  published_name = COALESCE(published_name, name),
  published_description = COALESCE(published_description, description),
  published_icon = COALESCE(published_icon, icon),
  published_status = COALESCE(published_status, status),
  published_payload = COALESCE(published_payload, payload),
  published_display_order = COALESCE(published_display_order, display_order),
  published_parent_id = COALESCE(published_parent_id, parent_id),
  published_action_type = COALESCE(published_action_type, action_type),
  published_auto_send = COALESCE(published_auto_send, auto_send),
  published_prompt_text = COALESCE(published_prompt_text, prompt_text),
  published_at = COALESCE(published_at, now());

CREATE INDEX IF NOT EXISTS idx_skills_published_parent_id ON public.skills(published_parent_id);
CREATE INDEX IF NOT EXISTS idx_skills_published_status_order ON public.skills(published_status, published_display_order);