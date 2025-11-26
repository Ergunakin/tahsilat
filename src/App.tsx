import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Empty from "@/components/Empty";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useEffect } from 'react'
import { useTenant } from '@/stores/tenant'
import { supabase } from '@/lib/supabase'

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
  const [session, setSession] = ((): [any, (s: any) => void] => {
    let _session: any = null
    const setS = (s: any) => { _session = s }
    return [_session, setS]
  })()
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { sub.subscription.unsubscribe() }
  }, [])
  if (!session) return <Navigate to="/login" replace />
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
          <Route index element={<TenantGate><Empty title="Şirket Ana Sayfa" /></TenantGate>} />
          <Route path="dashboard" element={<TenantGate><Protected><Empty title="Dashboard" /></Protected></TenantGate>} />
          <Route path="customers" element={<TenantGate><Protected><Empty title="Customers" /></Protected></TenantGate>} />
          <Route path="customers/:id" element={<TenantGate><Protected><Empty title="Customer Detail" /></Protected></TenantGate>} />
          <Route path="payments" element={<TenantGate><Protected><Empty title="Payments" /></Protected></TenantGate>} />
          <Route path="calendar" element={<TenantGate><Protected><Empty title="Calendar" /></Protected></TenantGate>} />
          <Route path="users" element={<TenantGate><Protected><Empty title="Users" /></Protected></TenantGate>} />
          <Route path="settings" element={<TenantGate><Protected><Empty title="Settings" /></Protected></TenantGate>} />
        </Route>
      </Routes>
    </Router>
  );
}
