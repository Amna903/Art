-- Function allowing authenticated users to switch between client and artist roles
CREATE OR REPLACE FUNCTION public.set_my_role(p_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent self-escalation to admin
  IF p_role NOT IN ('artist', 'client') THEN
    RAISE EXCEPTION 'Invalid role assignment';
  END IF;

  -- Remove any existing client/artist roles (keep admin if user is admin)
  DELETE FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('artist', 'client');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_role(public.app_role) TO authenticated;
