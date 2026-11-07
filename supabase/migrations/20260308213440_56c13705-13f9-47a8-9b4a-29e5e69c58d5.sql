
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  user_id uuid DEFAULT NULL,
  status text NOT NULL DEFAULT 'unread',
  admin_reply text DEFAULT NULL,
  replied_at timestamp with time zone DEFAULT NULL,
  replied_by uuid DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even non-authenticated users)
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage contact messages"
  ON public.contact_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own messages (if logged in)
CREATE POLICY "Users can view own contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
