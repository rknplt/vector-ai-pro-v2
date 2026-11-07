DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity_logs;

ALTER POLICY "Admins can manage activity logs" ON public.user_activity_logs
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
