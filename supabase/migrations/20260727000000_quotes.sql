-- ============ QUOTES (extends enquiries) ============
-- When an admin quotes a price for an enquiry, we generate a unique token
-- and send the buyer a private link: /checkout/[token]. The token is looked
-- up via a SECURITY DEFINER function rather than direct table access, so an
-- anonymous visitor can resolve their own quote without being able to read
-- anyone else's enquiries/quotes.

ALTER TABLE public.enquiries
  ADD COLUMN quoted_price NUMERIC,
  ADD COLUMN quote_token UUID UNIQUE,
  ADD COLUMN quote_token_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.get_quote_by_token(p_token UUID)
RETURNS TABLE (
  id UUID,
  artwork_title TEXT,
  artist_name TEXT,
  name TEXT,
  quoted_price NUMERIC,
  status public.enquiry_status,
  quote_token_expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, artwork_title, artist_name, name, quoted_price, status, quote_token_expires_at
  FROM public.enquiries
  WHERE quote_token = p_token
    AND quote_token_expires_at IS NOT NULL
    AND quote_token_expires_at > now();
$$;

REVOKE EXECUTE ON FUNCTION public.get_quote_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quote_by_token(UUID) TO anon, authenticated;
