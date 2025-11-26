-- Helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_company_id_for_user(u UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = u LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(u UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = u LIMIT 1;
$$;

-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view company users" ON users;
CREATE POLICY "Users can view company users" ON users
  FOR SELECT USING (
    company_id = public.get_company_id_for_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own row" ON users;
CREATE POLICY "Users can insert own row" ON users
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

-- Companies table policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id = public.get_company_id_for_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert company" ON companies;
CREATE POLICY "Users can insert company" ON companies
  FOR INSERT WITH CHECK (
    true
  );

