-- Drop existing FK constraints and re-add with ON DELETE CASCADE

-- partners
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_project_id_fkey;
ALTER TABLE public.partners ADD CONSTRAINT partners_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- expenses
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_project_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- audit_log
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_project_id_fkey;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- import_runs
ALTER TABLE public.import_runs DROP CONSTRAINT IF EXISTS import_runs_project_id_fkey;
ALTER TABLE public.import_runs ADD CONSTRAINT import_runs_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- import_message_hashes
ALTER TABLE public.import_message_hashes DROP CONSTRAINT IF EXISTS import_message_hashes_project_id_fkey;
ALTER TABLE public.import_message_hashes ADD CONSTRAINT import_message_hashes_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- receipt_inbox
ALTER TABLE public.receipt_inbox DROP CONSTRAINT IF EXISTS receipt_inbox_project_id_fkey;
ALTER TABLE public.receipt_inbox ADD CONSTRAINT receipt_inbox_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- sender_mappings
ALTER TABLE public.sender_mappings DROP CONSTRAINT IF EXISTS sender_mappings_project_id_fkey;
ALTER TABLE public.sender_mappings ADD CONSTRAINT sender_mappings_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;