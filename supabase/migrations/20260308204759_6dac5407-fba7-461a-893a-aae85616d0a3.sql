
-- User settings table for per-user admin controls
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  daily_message_limit integer DEFAULT 50,
  total_message_limit integer DEFAULT null,
  messages_used_today integer DEFAULT 0,
  last_message_reset timestamp with time zone DEFAULT now(),
  feature_chat boolean DEFAULT true,
  feature_image_analysis boolean DEFAULT true,
  feature_image_generation boolean DEFAULT true,
  feature_video_analysis boolean DEFAULT true,
  feature_voice_commands boolean DEFAULT true,
  feature_vehicle_diagnosis boolean DEFAULT true,
  feature_accounting boolean DEFAULT true,
  ai_model text DEFAULT 'google/gemini-2.5-flash',
  account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
  suspension_reason text DEFAULT null,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all user settings
CREATE POLICY "Admins can manage user settings"
  ON public.user_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can read their own settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-create user_settings when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Create settings for existing users who don't have them
INSERT INTO public.user_settings (user_id)
SELECT p.user_id FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings us WHERE us.user_id = p.user_id
);
