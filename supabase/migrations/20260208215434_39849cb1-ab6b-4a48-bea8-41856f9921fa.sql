
-- Drop all existing restrictive policies and replace with authenticated-user-wide access

-- EXPENSES
DROP POLICY IF EXISTS "Users can create expenses for own projects" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses of own projects" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses of own projects" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expenses of own projects" ON public.expenses;

CREATE POLICY "Authenticated users full access" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROJECTS
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;

CREATE POLICY "Authenticated users full access" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PARTNERS
DROP POLICY IF EXISTS "Users can create partners for own projects" ON public.partners;
DROP POLICY IF EXISTS "Users can delete partners of own projects" ON public.partners;
DROP POLICY IF EXISTS "Users can update partners of own projects" ON public.partners;
DROP POLICY IF EXISTS "Users can view partners of own projects" ON public.partners;

CREATE POLICY "Authenticated users full access" ON public.partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AUDIT_LOG
DROP POLICY IF EXISTS "Users can create audit logs for own projects" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view audit logs of own projects" ON public.audit_log;

CREATE POLICY "Authenticated users full access" ON public.audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IMPORT_RUNS
DROP POLICY IF EXISTS "Users can manage their import runs" ON public.import_runs;

CREATE POLICY "Authenticated users full access" ON public.import_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IMPORT_MESSAGE_HASHES
DROP POLICY IF EXISTS "Users can manage their message hashes" ON public.import_message_hashes;

CREATE POLICY "Authenticated users full access" ON public.import_message_hashes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RECEIPT_INBOX
DROP POLICY IF EXISTS "Users can manage their receipt inbox" ON public.receipt_inbox;

CREATE POLICY "Authenticated users full access" ON public.receipt_inbox FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SENDER_MAPPINGS
DROP POLICY IF EXISTS "Users can manage their sender mappings" ON public.sender_mappings;

CREATE POLICY "Authenticated users full access" ON public.sender_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
