-- Fix app_settings: Require authentication to read settings
DROP POLICY IF EXISTS "Everyone can read app settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix invite_codes: Only admins can view codes
-- Users redeem codes via the redeem_invite_code() SECURITY DEFINER function
-- so they don't need direct SELECT access to the codes
DROP POLICY IF EXISTS "Authenticated users can view unused codes to redeem" ON public.invite_codes;