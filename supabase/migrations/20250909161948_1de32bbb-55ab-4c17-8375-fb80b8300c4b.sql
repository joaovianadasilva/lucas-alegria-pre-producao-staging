-- Fix security issues by enabling RLS on existing tables
ALTER TABLE public.contatos_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.follow_up ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Create basic policies for existing tables (allowing all access for now, can be refined later)
CREATE POLICY "contatos_agente_all_access" ON public.contatos_agente FOR ALL USING (true);
CREATE POLICY "documents_all_access" ON public.documents FOR ALL USING (true);
CREATE POLICY "follow_up_all_access" ON public.follow_up FOR ALL USING (true);
CREATE POLICY "n8n_chat_histories_all_access" ON public.n8n_chat_histories FOR ALL USING (true);