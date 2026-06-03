-- Add file_path column to documents (stores object path in bucket)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_path text;

-- Storage policies for the 'documents' bucket
-- Path layout: {company_id}/{uuid}-{filename}
CREATE POLICY "members read documents files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_company_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "admins upload documents files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.is_company_admin((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "admins delete documents files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_company_admin((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "admins update documents files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_company_admin((storage.foldername(name))[1]::uuid, auth.uid())
  );