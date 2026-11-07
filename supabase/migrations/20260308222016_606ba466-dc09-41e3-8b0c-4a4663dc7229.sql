CREATE TABLE public.shared_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shares" ON public.shared_conversations
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);