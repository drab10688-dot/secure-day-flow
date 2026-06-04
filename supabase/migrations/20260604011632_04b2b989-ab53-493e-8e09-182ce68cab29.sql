
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deactivation_reason text;

-- Update membership checks so inactive companies block access (super admin bypass)
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.companies c ON c.id = cm.company_id
    WHERE cm.company_id = _company_id AND cm.user_id = _user_id
      AND cm.status = 'aprobado' AND c.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.companies c ON c.id = cm.company_id
    WHERE cm.company_id = _company_id AND cm.user_id = _user_id
      AND cm.role IN ('admin','supervisor') AND cm.status = 'aprobado'
      AND c.is_active = true
  );
$$;
