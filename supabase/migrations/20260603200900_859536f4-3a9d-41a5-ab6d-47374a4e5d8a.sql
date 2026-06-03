ALTER POLICY "members view companies" ON public.companies
  USING (public.is_company_member(id, auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "company members view teammate profiles" ON public.profiles;
CREATE POLICY "company members view teammate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.company_members viewer
    JOIN public.company_members target ON target.company_id = viewer.company_id
    WHERE viewer.user_id = auth.uid()
      AND target.user_id = profiles.id
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM ('pendiente', 'aprobado', 'rechazado');
  END IF;
END $$;

ALTER TABLE public.shift_approvals
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy numeric,
  ADD COLUMN IF NOT EXISTS selfie_path text,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS questionnaire jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_approvals TO authenticated;
GRANT ALL ON public.shift_approvals TO service_role;

DROP POLICY IF EXISTS "worker updates own shift" ON public.shift_approvals;
CREATE POLICY "worker updates own shift"
ON public.shift_approvals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()));

DROP POLICY IF EXISTS "shift selfie upload by company members" ON storage.objects;
CREATE POLICY "shift selfie upload by company members"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shift-selfies'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_company_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "shift selfie read by company members" ON storage.objects;
CREATE POLICY "shift selfie read by company members"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shift-selfies'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_company_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "shift selfie update own files" ON storage.objects;
CREATE POLICY "shift selfie update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shift-selfies'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'shift-selfies'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "shift selfie delete own files" ON storage.objects;
CREATE POLICY "shift selfie delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shift-selfies'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);