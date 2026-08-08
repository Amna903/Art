
-- 1. order_items: explicit restrictive deny for UPDATE and DELETE
CREATE POLICY "No updates to order items" ON public.order_items
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No deletes of order items" ON public.order_items
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 2. user_roles: restrictive policy ensuring only admins may insert roles
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from authenticated/anon.
-- RLS policy predicates run as table owner-adjacent and can still invoke these
-- via the definer-owner privileges; revoking direct EXECUTE prevents users
-- from calling them as RPCs.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_primary_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_primary_role() TO service_role;
