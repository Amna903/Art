DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles authenticated read" ON public.profiles FOR SELECT TO authenticated USING (true);