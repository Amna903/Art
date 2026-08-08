-- ============ ENQUIRIES ============
-- Replaces public checkout pricing: visitors submit an enquiry for an
-- artwork instead of seeing/paying a listed price. Admins triage these in
-- the admin console and follow up directly with a quote.

CREATE TYPE public.enquiry_status AS ENUM ('new', 'contacted', 'quoted', 'closed');

CREATE TABLE public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_slug TEXT NOT NULL,
  artwork_title TEXT NOT NULL,
  artist_name TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  status public.enquiry_status NOT NULL DEFAULT 'new',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anyone (including logged-out visitors) can submit an enquiry.
GRANT INSERT ON public.enquiries TO anon, authenticated;
-- Only admins can read/manage the inbox.
GRANT SELECT, UPDATE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an enquiry" ON public.enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read all enquiries" ON public.enquiries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update enquiries" ON public.enquiries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER enquiries_set_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
