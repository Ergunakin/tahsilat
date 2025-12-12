-- Customers INSERT policy: allow creating customers within own company
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insert customers by role" ON customers;
CREATE POLICY "Insert customers by role" ON customers
  FOR INSERT
  WITH CHECK (
    company_id = public.get_company_id_for_user(auth.uid()) AND
    CASE
      WHEN public.get_user_role(auth.uid()) = 'seller' THEN
        assigned_seller_id = auth.uid()
      WHEN public.get_user_role(auth.uid()) = 'manager' THEN
        assigned_seller_id IN (SELECT id FROM users WHERE manager_id = auth.uid())
      ELSE true
    END
  );

-- Debts INSERT policy: allow creating debts within own company
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insert debts by role" ON debts;
CREATE POLICY "Insert debts by role" ON debts
  FOR INSERT
  WITH CHECK (
    company_id = public.get_company_id_for_user(auth.uid()) AND
    CASE
      WHEN public.get_user_role(auth.uid()) = 'seller' THEN
        seller_id = auth.uid()
      WHEN public.get_user_role(auth.uid()) = 'manager' THEN
        seller_id IN (SELECT id FROM users WHERE manager_id = auth.uid()) OR seller_id IS NULL
      ELSE true
    END
  );

