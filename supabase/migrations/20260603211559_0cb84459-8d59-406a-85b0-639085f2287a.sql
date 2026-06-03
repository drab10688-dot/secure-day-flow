CREATE POLICY "anon list companies" ON public.companies FOR SELECT TO anon USING (true);
GRANT SELECT ON public.companies TO anon;