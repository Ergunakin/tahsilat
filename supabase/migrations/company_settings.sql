CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id),
  currencies TEXT[] DEFAULT ARRAY['TL','USD','EUR'],
  receivable_types TEXT[] DEFAULT ARRAY['Senet','Çek','Havale'],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View company settings" ON company_settings;
CREATE POLICY "View company settings" ON company_settings
  FOR SELECT USING (
    company_id = public.get_company_id_for_user(auth.uid())
  );

DROP POLICY IF EXISTS "Upsert company settings" ON company_settings;
CREATE POLICY "Upsert company settings" ON company_settings
  FOR INSERT WITH CHECK (
    company_id = public.get_company_id_for_user(auth.uid())
  );

DROP POLICY IF EXISTS "Update company settings" ON company_settings;
CREATE POLICY "Update company settings" ON company_settings
  FOR UPDATE USING (
    company_id = public.get_company_id_for_user(auth.uid())
  ) WITH CHECK (
    company_id = public.get_company_id_for_user(auth.uid())
  );

