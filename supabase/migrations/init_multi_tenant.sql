-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    currency_preferences VARCHAR[] DEFAULT '{"TRY"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'seller', 'accountant')),
    company_id UUID REFERENCES companies(id),
    manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    tax_number VARCHAR(50),
    address TEXT,
    assigned_seller_id UUID REFERENCES users(id),
    total_debt DECIMAL(15,2) DEFAULT 0,
    overdue_debt DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    company_id UUID REFERENCES companies(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) CHECK (currency IN ('TRY', 'USD', 'EUR')),
    due_date DATE NOT NULL,
    description TEXT,
    seller_id UUID REFERENCES users(id),
    remaining_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID REFERENCES debts(id),
    customer_id UUID REFERENCES customers(id),
    company_id UUID REFERENCES companies(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) CHECK (currency IN ('TRY', 'USD', 'EUR')),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment promises table
CREATE TABLE IF NOT EXISTS payment_promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    company_id UUID REFERENCES companies(id),
    promised_date DATE NOT NULL,
    promised_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) CHECK (currency IN ('TRY', 'USD', 'EUR')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'broken')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    company_id UUID REFERENCES companies(id),
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_seller ON customers(assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_promises_customer_id ON payment_promises(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_promises_promised_date ON payment_promises(promised_date);

-- Trigger function for customer debt totals
CREATE OR REPLACE FUNCTION update_customer_debt_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET total_debt = (SELECT COALESCE(SUM(remaining_amount), 0) FROM debts WHERE customer_id = NEW.customer_id),
        overdue_debt = (SELECT COALESCE(SUM(remaining_amount), 0) FROM debts WHERE customer_id = NEW.customer_id AND due_date < CURRENT_DATE),
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_debt_after_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_debt_totals();

-- RLS policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    auth.uid()::text = (SELECT id::text FROM users WHERE company_id = companies.id LIMIT 1)
  );

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view company users" ON users;
CREATE POLICY "Users can view company users" ON users
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View customers by role" ON customers;
CREATE POLICY "View customers by role" ON customers
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
    CASE
      WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'seller' THEN
        assigned_seller_id = auth.uid()
      WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'manager' THEN
        assigned_seller_id IN (SELECT id FROM users WHERE manager_id = auth.uid())
      ELSE true
    END
  );

GRANT SELECT ON companies TO anon;
GRANT ALL ON companies TO authenticated;
GRANT SELECT ON users TO anon;
GRANT ALL ON users TO authenticated;
GRANT SELECT ON customers TO anon;
GRANT ALL ON customers TO authenticated;
