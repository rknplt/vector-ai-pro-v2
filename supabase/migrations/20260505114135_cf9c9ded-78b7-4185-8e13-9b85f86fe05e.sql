-- 1. Remove privilege-escalation: users could overwrite limits/status/feature flags
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

-- 2. Tighten shared_conversations INSERT: verify the conversation actually belongs to the user
DROP POLICY IF EXISTS "Users can manage own shares" ON public.shared_conversations;

CREATE POLICY "Users can view own shares"
ON public.shared_conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create shares for own conversations"
ON public.shared_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own shares"
ON public.shared_conversations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);