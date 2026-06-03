
-- Allow a signed-in user to create their own pending membership request
CREATE POLICY "self request membership"
ON public.company_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pendiente');

-- Allow any authenticated user to read company names/nits (so they can pick one to join)
CREATE POLICY "authed list companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);
