CREATE OR REPLACE FUNCTION public.get_customer_currency_totals(p_company_id UUID)
RETURNS TABLE (
  customer_id UUID,
  currency TEXT,
  total NUMERIC,
  overdue_total NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH visible_debts AS (
    SELECT d.customer_id, d.currency, d.remaining_amount, d.due_date, d.status
    FROM debts d
    WHERE d.company_id = p_company_id
  )
  SELECT 
    vd.customer_id,
    vd.currency,
    COALESCE(SUM(vd.remaining_amount), 0) AS total,
    COALESCE(SUM(CASE WHEN (vd.status IN ('active','partial') AND vd.due_date < CURRENT_DATE) THEN vd.remaining_amount ELSE 0 END), 0) AS overdue_total
  FROM visible_debts vd
  GROUP BY vd.customer_id, vd.currency;
$$;

