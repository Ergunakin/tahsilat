CREATE OR REPLACE FUNCTION public.get_company_id_by_slug(s TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM companies WHERE slug = s LIMIT 1;
$$;

