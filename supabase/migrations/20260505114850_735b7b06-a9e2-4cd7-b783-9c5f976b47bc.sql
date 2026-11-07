-- Move role checks out of the exposed public API surface while keeping RLS recursion-safe
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Service-only invite redemption used by the backend function
CREATE OR REPLACE FUNCTION public.admin_redeem_invite_code(code_to_redeem text, redeeming_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  IF redeeming_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = upper(trim(code_to_redeem))
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.invite_codes
  SET is_used = true,
      used_by = redeeming_user_id,
      used_at = now()
  WHERE id = invite_record.id;

  UPDATE public.profiles
  SET plan = invite_record.plan_granted,
      updated_at = now()
  WHERE user_id = redeeming_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_redeem_invite_code(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_redeem_invite_code(text, uuid) TO service_role;

-- Keep the legacy function unavailable to browser clients
REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Update admin policies to use the private role helper
ALTER POLICY "Only admins can manage AI API keys" ON public.ai_api_keys
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage app settings" ON public.app_settings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can view audit logs" ON public.audit_logs
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can create audit logs" ON public.audit_logs
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage contact messages" ON public.contact_messages
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage invite codes" ON public.invite_codes
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage login attempts" ON public.login_attempts
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can create profiles" ON public.profiles
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can view all profiles" ON public.profiles
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can update all profiles" ON public.profiles
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage announcements" ON public.system_announcements
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage activity logs" ON public.user_activity_logs
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage all documents" ON public.user_knowledge_base
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage all roles" ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Only admins can insert user roles" ON public.user_roles
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Only admins can update user roles" ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Only admins can delete user roles" ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage user settings" ON public.user_settings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Replace permissive public-write checks with scoped validation
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 100
  AND length(trim(email)) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(trim(subject)) BETWEEN 1 AND 200
  AND length(trim(message)) BETWEEN 1 AND 2000
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;
CREATE POLICY "Anyone can insert login attempts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(email)) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (ip_address IS NULL OR length(trim(ip_address)) BETWEEN 1 AND 64)
);

-- Prevent direct client-side promotion of personal documents into global/persistent memory
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.user_knowledge_base;
CREATE POLICY "Users can insert their own documents"
ON public.user_knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_global = false);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.user_knowledge_base;
CREATE POLICY "Users can update their own documents"
ON public.user_knowledge_base
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND is_global = false);
