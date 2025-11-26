import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTenant } from '@/stores/tenant'
import { supabase } from '@/lib/supabase'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { company } = useTenant()
  const { companySlug } = useParams()
  const navigate = useNavigate()
  const onLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }
  const slug = companySlug as string
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">{company?.name ?? slug}</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to={`/${slug}/dashboard`} className="hover:underline">Dashboard</Link>
            <Link to={`/${slug}/customers`} className="hover:underline">Customers</Link>
            <Link to={`/${slug}/payments`} className="hover:underline">Payments</Link>
            <Link to={`/${slug}/users`} className="hover:underline">Users</Link>
            <Link to={`/${slug}/settings`} className="hover:underline">Settings</Link>
            <button onClick={onLogout} className="ml-4 rounded px-3 py-1 border border-neutral-300 dark:border-neutral-700">Logout</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
