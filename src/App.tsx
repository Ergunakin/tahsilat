import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Empty from "@/components/Empty";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useEffect, useState } from 'react'
import { useTenant } from '@/stores/tenant'
import { supabase } from '@/lib/supabase'
import Payments from '@/pages/Payments'
import Settings from '@/pages/Settings'
import CalendarPage from '@/pages/Calendar'
import TenantLayout from '@/components/TenantLayout'
import Dashboard from '@/pages/Dashboard'
import Customers from '@/pages/Customers'
import Users from '@/pages/Users'

function TenantGate({ children }: { children: React.ReactNode }) {
  const { companySlug } = useParams()
  const { slug, fetchCompany } = useTenant()
  useEffect(() => {
    const s = companySlug ?? null
    if (s && s !== slug) {
      fetchCompany(s)
    }
  }, [companySlug, slug, fetchCompany])
  return children as any
}

function Protected({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const { company } = useTenant()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    const check = async () => {
      if (!company?.id || !session?.user?.id) { setAuthorized(null); return }
      const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle()
      setAuthorized(!!data && data.company_id === company.id)
    }
    check()
  }, [company?.id, session?.user?.id])
  if (checking) return null
  if (!session) return <Navigate to="/login" replace />
  if (authorized === null) return null
  if (authorized === false) return <Navigate to="/login" replace />
  return children as any
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Empty title="Demo" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path=":companySlug">
          <Route index element={<TenantGate><TenantLayout><Empty title="Şirket Ana Sayfa" /></TenantLayout></TenantGate>} />
          <Route path="dashboard" element={<TenantGate><Protected><TenantLayout><Dashboard /></TenantLayout></Protected></TenantGate>} />
          <Route path="customers" element={<TenantGate><Protected><TenantLayout><Customers /></TenantLayout></Protected></TenantGate>} />
          <Route path="customers/:id" element={<TenantGate><Protected><TenantLayout><Empty title={"Customer Detail"} /></TenantLayout></Protected></TenantGate>} />
          <Route path="payments" element={<TenantGate><Protected><TenantLayout><Payments /></TenantLayout></Protected></TenantGate>} />
          <Route path="calendar" element={<TenantGate><Protected><TenantLayout><CalendarPage /></TenantLayout></Protected></TenantGate>} />
          <Route path="users" element={<TenantGate><Protected><TenantLayout><Users /></TenantLayout></Protected></TenantGate>} />
          <Route path="settings" element={<TenantGate><Protected><TenantLayout><Settings /></TenantLayout></Protected></TenantGate>} />
        </Route>
      </Routes>
    </Router>
  );
}
