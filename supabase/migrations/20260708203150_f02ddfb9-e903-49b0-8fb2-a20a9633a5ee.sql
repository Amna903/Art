
-- Switch to SECURITY INVOKER so functions no longer run with elevated privileges.
-- authenticated already has SELECT on user_roles, so these still work.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_my_primary_role()
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'artist' THEN 2 WHEN 'client' THEN 3 END
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_primary_role() TO authenticated;
