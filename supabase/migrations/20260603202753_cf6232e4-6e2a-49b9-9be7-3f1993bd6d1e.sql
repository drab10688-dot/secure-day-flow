
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id AND status = 'aprobado'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id
      AND role IN ('admin','supervisor') AND status = 'aprobado'
  );
$$;

-- Let the super-admin see every company and every membership row
DROP POLICY IF EXISTS "super admin sees all companies" ON public.companies;
CREATE POLICY "super admin sees all companies" ON public.companies
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin sees all members" ON public.company_members;
CREATE POLICY "super admin sees all members" ON public.company_members
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
