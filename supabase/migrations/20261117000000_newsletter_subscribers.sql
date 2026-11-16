-- Newsletter sign-ups from the home page, footer and Collections page.
-- Anyone may add their email; nobody can read the list through the public
-- API (admins read it in the Supabase dashboard or with the service role).
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320)
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON public.newsletter_subscribers (lower(email));

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);
