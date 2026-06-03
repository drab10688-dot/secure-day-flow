GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated;