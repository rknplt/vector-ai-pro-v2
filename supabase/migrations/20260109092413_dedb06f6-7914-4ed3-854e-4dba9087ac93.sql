-- Fix invite_codes: Require authentication to view codes
DROP POLICY IF EXISTS "Users can view unused codes to redeem" ON public.invite_codes;

CREATE POLICY "Authenticated users can view unused codes to redeem" 
ON public.invite_codes 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_used = false 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Fix profiles: Add explicit denial for anonymous users
-- Drop existing SELECT policies and recreate with auth check
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles: Add explicit denial for anonymous users
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);