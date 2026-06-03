
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS eps TEXT,
  ADD COLUMN IF NOT EXISTS arl TEXT,
  ADD COLUMN IF NOT EXISTS afp TEXT,
  ADD COLUMN IF NOT EXISTS blood_type TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

DROP POLICY IF EXISTS "company admin updates teammate profile" ON public.profiles;
CREATE POLICY "company admin updates teammate profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.company_members admin
      JOIN public.company_members target ON target.company_id = admin.company_id
      WHERE admin.user_id = auth.uid()
        AND admin.role IN ('admin','supervisor')
        AND admin.status = 'aprobado'
        AND target.user_id = profiles.id
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.company_members admin
      JOIN public.company_members target ON target.company_id = admin.company_id
      WHERE admin.user_id = auth.uid()
        AND admin.role IN ('admin','supervisor')
        AND admin.status = 'aprobado'
        AND target.user_id = profiles.id
    )
  );
