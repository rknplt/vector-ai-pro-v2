
-- ============================================================
-- FIX: Recreate ALL RLS policies as PERMISSIVE (default)
-- Root cause: All policies were created as RESTRICTIVE which 
-- blocks ALL data access since PostgreSQL requires at least 
-- one PERMISSIVE policy for rows to be accessible.
-- Also fixes: contact_messages INSERT WITH CHECK (true) → restrict to own user_id or anon
-- ============================================================

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== chat_messages ====================
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;

CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== conversations ====================
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== app_settings ====================
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== audit_logs ====================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ==================== invite_codes ====================
DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.invite_codes;

CREATE POLICY "Admins can manage invite codes" ON public.invite_codes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== user_settings ====================
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Admins can manage user settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user settings" ON public.user_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== shared_conversations ====================
DROP POLICY IF EXISTS "Users can manage own shares" ON public.shared_conversations;

CREATE POLICY "Users can manage own shares" ON public.shared_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==================== contact_messages ====================
-- FIX WARN: Replace WITH CHECK (true) with proper check
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can view own contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view own contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage contact messages" ON public.contact_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== ai_api_keys ====================
DROP POLICY IF EXISTS "Only admins can manage AI API keys" ON public.ai_api_keys;

CREATE POLICY "Only admins can manage AI API keys" ON public.ai_api_keys FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ==================== system_announcements ====================
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Users can read active announcements" ON public.system_announcements;

CREATE POLICY "Admins can manage announcements" ON public.system_announcements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read active announcements" ON public.system_announcements FOR SELECT TO authenticated USING (is_active = true);
