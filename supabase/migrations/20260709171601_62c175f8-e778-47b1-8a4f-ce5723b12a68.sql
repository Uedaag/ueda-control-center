ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.skills(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'js' CHECK (action_type IN ('js','chat_prompt')),
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt_text text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_skills_parent_id ON public.skills(parent_id);

INSERT INTO public.skills (name, description, icon, status, action_type, auto_send, prompt_text, display_order)
SELECT
  'Copy Marketing Master',
  'Especialista em copywriting e conversão — reescreve textos com foco em vendas.',
  'Sparkles',
  true,
  'chat_prompt',
  true,
  E'Você é um especialista sênior em copywriting, marketing digital, posicionamento e persuasão.\n\nTransforme a comunicação atual desta tela em uma copy de alta conversão aplicando:\n- Proposta de valor clara em 5 segundos\n- Headline forte + subheadline persuasiva\n- Foco em benefício (não em features)\n- Gatilhos mentais (urgência, prova social, autoridade)\n- CTA claro e direto\n- Estrutura AIDA ou PAS\n\nEntregue a copy reescrita pronta para uso.',
  COALESCE((SELECT MAX(display_order)+1 FROM public.skills), 1)
WHERE NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Copy Marketing Master');