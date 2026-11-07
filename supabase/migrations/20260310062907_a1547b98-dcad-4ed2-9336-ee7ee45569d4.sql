
-- ============================================================
-- 1. User Knowledge Base - stores extracted file content per user
-- ============================================================
CREATE TABLE public.user_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  content TEXT NOT NULL,
  summary TEXT,
  file_size INTEGER,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.user_knowledge_base
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.user_knowledge_base
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.user_knowledge_base
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.user_knowledge_base
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents" ON public.user_knowledge_base
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_knowledge_base_user_id ON public.user_knowledge_base(user_id);
CREATE INDEX idx_knowledge_base_conversation ON public.user_knowledge_base(conversation_id);

-- ============================================================
-- 2. User Activity Logs - track user actions for security
-- ============================================================
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity
CREATE POLICY "Users can view their own activity" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own activity" ON public.user_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can manage activity logs" ON public.user_activity_logs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_activity_logs_user ON public.user_activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.user_activity_logs(created_at DESC);

-- ============================================================
-- 3. Login Attempts tracking
-- ============================================================
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can read login attempts
CREATE POLICY "Admins can manage login attempts" ON public.login_attempts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert (for tracking failed logins before auth)
CREATE POLICY "Anyone can insert login attempts" ON public.login_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_login_attempts_email ON public.login_attempts(email, created_at DESC);

-- ============================================================
-- 4. Storage bucket for user files
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-files', 'user-files', false, 20971520);

-- Storage RLS: users can only manage their own files
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
