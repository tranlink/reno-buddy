
-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp_group_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Partners table
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partners of own projects" ON public.partners FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = partners.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create partners for own projects" ON public.partners FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = partners.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update partners of own projects" ON public.partners FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = partners.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete partners of own projects" ON public.partners FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = partners.project_id AND projects.user_id = auth.uid()));

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_egp NUMERIC(12,2) NOT NULL,
  paid_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
  category TEXT,
  notes TEXT,
  receipt_urls TEXT[] DEFAULT '{}',
  missing_receipt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses of own projects" ON public.expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = expenses.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create expenses for own projects" ON public.expenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = expenses.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update expenses of own projects" ON public.expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = expenses.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete expenses of own projects" ON public.expenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = expenses.project_id AND projects.user_id = auth.uid()));

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  note TEXT
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of own projects" ON public.audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = audit_log.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create audit logs for own projects" ON public.audit_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = audit_log.project_id AND projects.user_id = auth.uid()));

-- Updated_at trigger for expenses
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated users can update receipts" ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete receipts" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
