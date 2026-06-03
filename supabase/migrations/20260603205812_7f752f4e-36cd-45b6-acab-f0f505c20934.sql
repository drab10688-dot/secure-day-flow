
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Don't auto-add super-admins as company members; they manage everything globally
  IF EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = NEW.created_by) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.company_members (company_id, user_id, role, position, status, approved_at, approved_by)
  VALUES (NEW.id, NEW.created_by, 'admin', 'Administrador', 'aprobado', now(), NEW.created_by)
  ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END; $function$;

-- Remove existing super-admin entries from company_members
DELETE FROM public.company_members
WHERE user_id IN (SELECT user_id FROM public.super_admins);
