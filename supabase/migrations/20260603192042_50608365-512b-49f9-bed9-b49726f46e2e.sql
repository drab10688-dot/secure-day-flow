
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'worker');
CREATE TYPE public.incident_type AS ENUM ('incidente', 'accidente', 'casi_accidente');
CREATE TYPE public.severity_level AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE public.risk_level AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE public.incident_status AS ENUM ('abierto', 'en_revision', 'cerrado');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  document_id TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nit TEXT,
  sector TEXT,
  address TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- company_members
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'worker',
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- security definer helpers
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id UUID, _user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = _user_id AND role IN ('admin','supervisor'));
$$;

-- companies policies
CREATE POLICY "members view companies" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(id, auth.uid()));
CREATE POLICY "anyone create company" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "admins update company" ON public.companies FOR UPDATE TO authenticated
  USING (public.is_company_admin(id, auth.uid()));
CREATE POLICY "admins delete company" ON public.companies FOR DELETE TO authenticated
  USING (public.has_company_role(id, auth.uid(), 'admin'));

-- company_members policies
CREATE POLICY "members view members" ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "admins manage members" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(company_id, auth.uid()) OR EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.created_by = auth.uid()));
CREATE POLICY "admins update members" ON public.company_members FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete members" ON public.company_members FOR DELETE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

-- shift_approvals
CREATE TABLE public.shift_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  epp_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_ok BOOLEAN NOT NULL DEFAULT true,
  conditions_ok BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_approvals TO authenticated;
GRANT ALL ON public.shift_approvals TO service_role;
ALTER TABLE public.shift_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view shifts" ON public.shift_approvals FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "worker creates own shift" ON public.shift_approvals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_company_member(company_id, auth.uid()));
CREATE POLICY "worker updates own shift" ON public.shift_approvals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()));

-- incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  type public.incident_type NOT NULL,
  severity public.severity_level NOT NULL DEFAULT 'baja',
  status public.incident_status NOT NULL DEFAULT 'abierto',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT,
  description TEXT NOT NULL,
  immediate_actions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view incidents" ON public.incidents FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "members create incidents" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by AND public.is_company_member(company_id, auth.uid()));
CREATE POLICY "admins update incidents" ON public.incidents FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()) OR reported_by = auth.uid());
CREATE POLICY "admins delete incidents" ON public.incidents FOR DELETE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

-- documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  url TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view docs" ON public.documents FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "admins create docs" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update docs" ON public.documents FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete docs" ON public.documents FOR DELETE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

-- risk_matrix
CREATE TABLE public.risk_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  activity TEXT NOT NULL,
  hazard TEXT NOT NULL,
  risk_level public.risk_level NOT NULL DEFAULT 'media',
  controls TEXT,
  responsible TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_matrix TO authenticated;
GRANT ALL ON public.risk_matrix TO service_role;
ALTER TABLE public.risk_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view risks" ON public.risk_matrix FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "admins manage risks" ON public.risk_matrix FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update risks" ON public.risk_matrix FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete risks" ON public.risk_matrix FOR DELETE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

-- profile auto-create trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- when a company is created, add creator as admin member
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role, position)
  VALUES (NEW.id, NEW.created_by, 'admin', 'Administrador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();
