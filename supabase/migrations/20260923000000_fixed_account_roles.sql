-- Artist and collector are mutually exclusive, permanent account roles.
-- `admin` remains an operational permission and may be granted alongside either.

-- Existing dual-role accounts followed the old dashboard's artist-first precedence.
-- Preserve that behaviour while bringing old data into the new invariant.
DELETE FROM public.user_roles AS collector
USING public.user_roles AS artist
WHERE collector.user_id = artist.user_id
  AND collector.role = 'client'::public.app_role
  AND artist.role = 'artist'::public.app_role;

CREATE OR REPLACE FUNCTION public.enforce_fixed_marketplace_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('artist'::public.app_role, 'client'::public.app_role) THEN
    -- Serialize assignments for a user so concurrent requests cannot claim both roles.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));

    IF EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = NEW.user_id
        AND role IN ('artist'::public.app_role, 'client'::public.app_role)
        AND role <> NEW.role
        AND (TG_OP = 'INSERT' OR user_id <> OLD.user_id OR role <> OLD.role)
    ) THEN
      RAISE EXCEPTION 'An account can be either an artist or a collector, not both.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_fixed_marketplace_role ON public.user_roles;
CREATE TRIGGER enforce_fixed_marketplace_role
  BEFORE INSERT OR UPDATE OF user_id, role ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_fixed_marketplace_role();

-- This RPC is retained only for legacy OAuth accounts that were created without
-- a role. It may make an initial assignment, but can never replace one.
CREATE OR REPLACE FUNCTION public.set_my_role(p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('artist'::public.app_role, 'client'::public.app_role) THEN
    RAISE EXCEPTION 'Invalid role assignment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('artist'::public.app_role, 'client'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Your account role is fixed and cannot be changed.';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), p_role);
END;
$$;

-- Never accept an admin role from user-controlled sign-up metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_role := CASE WHEN NEW.raw_user_meta_data->>'role' = 'artist' THEN 'artist'::public.app_role ELSE 'client'::public.app_role END;

  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, v_name) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
