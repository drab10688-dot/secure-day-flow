
-- Enum for membership approval
DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('pendiente','aprobado','rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS status public.membership_status NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Existing rows: approve them so we don't lock anyone out
UPDATE public.company_members SET status = 'aprobado' WHERE status = 'pendiente';

-- Tighten helper functions to only count approved memberships
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id AND status = 'aprobado'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id
      AND role IN ('admin','supervisor') AND status = 'aprobado'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id uuid, _user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id
      AND role = _role AND status = 'aprobado'
  );
$$;

-- Creator of a company should auto-approve as admin
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role, position, status, approved_at, approved_by)
  VALUES (NEW.id, NEW.created_by, 'admin', 'Administrador', 'aprobado', now(), NEW.created_by)
  ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Allow a user to see their own membership row even when pending (so the UI can show "esperando aprobación")
DROP POLICY IF EXISTS "self view own membership" ON public.company_members;
CREATE POLICY "self view own membership" ON public.company_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
