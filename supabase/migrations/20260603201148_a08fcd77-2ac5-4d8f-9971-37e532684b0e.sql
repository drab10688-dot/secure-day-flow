CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role, position)
  VALUES (NEW.id, NEW.created_by, 'admin', 'Administrador')
  ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

INSERT INTO public.company_members (company_id, user_id, role, position)
SELECT c.id, c.created_by, 'admin', 'Administrador'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.company_members cm
  WHERE cm.company_id = c.id
    AND cm.user_id = c.created_by
)
ON CONFLICT (company_id, user_id) DO NOTHING;