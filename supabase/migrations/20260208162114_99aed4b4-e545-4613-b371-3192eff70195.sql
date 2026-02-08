
-- Import runs
CREATE TABLE public.import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  filename TEXT,
  expenses_imported INT DEFAULT 0,
  receipts_matched INT DEFAULT 0,
  receipts_unmatched INT DEFAULT 0
);
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their import runs" ON public.import_runs FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

-- Import message hashes for duplicate detection
CREATE TABLE public.import_message_hashes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  message_hash TEXT NOT NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  import_run_id UUID REFERENCES public.import_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, message_hash)
);
ALTER TABLE public.import_message_hashes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their message hashes" ON public.import_message_hashes FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

-- Sender mappings per project
CREATE TABLE public.sender_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  whatsapp_name TEXT NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ignored BOOLEAN DEFAULT false,
  UNIQUE(project_id, whatsapp_name)
);
ALTER TABLE public.sender_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their sender mappings" ON public.sender_mappings FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

-- Receipt inbox for unmatched receipts
CREATE TABLE public.receipt_inbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  import_run_id UUID REFERENCES public.import_runs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  whatsapp_sender TEXT,
  timestamp TIMESTAMPTZ,
  assigned_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their receipt inbox" ON public.receipt_inbox FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);
