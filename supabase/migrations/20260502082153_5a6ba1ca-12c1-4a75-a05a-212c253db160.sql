-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to delete audit logs older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (now() - INTERVAL '90 days');
END;
$$;

-- Restrict execution to postgres/service_role only (not callable by anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM PUBLIC, anon, authenticated;

-- Schedule daily cleanup at 03:00 UTC
SELECT cron.schedule(
  'cleanup-old-audit-logs-daily',
  '0 3 * * *',
  $$ SELECT public.cleanup_old_audit_logs(); $$
);