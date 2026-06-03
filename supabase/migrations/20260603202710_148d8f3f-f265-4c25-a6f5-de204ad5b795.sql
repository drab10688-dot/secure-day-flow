
CREATE TABLE IF NOT EXISTS public.super_admins (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone authed can read super admin" ON public.super_admins;
CREATE POLICY "anyone authed can read super admin" ON public.super_admins
  FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies => locked from clients. Only service_role (and migrations) can touch it.

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id);
$$;
