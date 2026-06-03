DROP POLICY IF EXISTS "self create own attendance" ON public.training_attendees;
CREATE POLICY "self create own attendance"
ON public.training_attendees
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.trainings t
    WHERE t.id = training_attendees.training_id
      AND public.is_company_member(t.company_id, auth.uid())
  )
);