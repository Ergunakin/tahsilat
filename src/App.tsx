import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Empty from "@/components/Empty";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useEffect, useState } from 'react'
import { useTenant } from '@/stores/tenant'
import { supabase } from '@/lib/supabase'
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
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { subscription.unsubscribe() }
  }, [])
  if (checking) return null
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
          <Route index element={<TenantGate><TenantLayout><Empty title="Şirket Ana Sayfa" /></TenantLayout></TenantGate>} />
          <Route path="dashboard" element={<TenantGate><Protected><TenantLayout><Dashboard /></TenantLayout></Protected></TenantGate>} />
          <Route path="customers" element={<TenantGate><Protected><TenantLayout><Customers /></TenantLayout></Protected></TenantGate>} />
          <Route path="customers/:id" element={<TenantGate><Protected><Empty title="Customer Detail" /></Protected></TenantGate>} />
          <Route path="payments" element={<TenantGate><Protected><TenantLayout><Empty title="Payments" /></TenantLayout></Protected></TenantGate>} />
          <Route path="calendar" element={<TenantGate><Protected><TenantLayout><Empty title="Calendar" /></TenantLayout></Protected></TenantGate>} />
          <Route path="users" element={<TenantGate><Protected><TenantLayout><Users /></TenantLayout></Protected></TenantGate>} />
          <Route path="settings" element={<TenantGate><Protected><TenantLayout><Empty title="Settings" /></TenantLayout></Protected></TenantGate>} />
        </Route>
      </Routes>
    </Router>
  );
}
