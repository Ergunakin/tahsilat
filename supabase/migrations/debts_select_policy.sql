ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View debts by role" ON debts;
CREATE POLICY "View debts by role" ON debts
  FOR SELECT USING (
    company_id = public.get_company_id_for_user(auth.uid()) AND
    CASE
      WHEN public.get_user_role(auth.uid()) = 'seller' THEN
        seller_id = auth.uid()
      WHEN public.get_user_role(auth.uid()) = 'manager' THEN
        seller_id IN (SELECT id FROM users WHERE manager_id = auth.uid()) OR seller_id IS NULL
      ELSE true
    END
  );

