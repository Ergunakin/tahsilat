import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTenant } from '@/stores/tenant'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/i18n'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { company } = useTenant()
  const { companySlug } = useParams()
  const navigate = useNavigate()
  const { t, lang, setLang } = useI18n()
  const onLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }
  const slug = companySlug as string
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">{slug}</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to={`/${slug}/dashboard`} className="hover:underline">{t('nav_dashboard')}</Link>
            <Link to={`/${slug}/customers`} className="hover:underline">{t('nav_customers')}</Link>
            <Link to={`/${slug}/payments`} className="hover:underline">{t('nav_payments')}</Link>
            <Link to={`/${slug}/users`} className="hover:underline">{t('nav_users')}</Link>
            <Link to={`/${slug}/settings`} className="hover:underline">{t('nav_settings')}</Link>
            <div className="ml-2 flex items-center gap-2">
              <button onClick={()=>setLang('tr')} className={`rounded px-2 py-1 border ${lang==='tr'?'bg-neutral-200 dark:bg-neutral-800':''}`}>TR</button>
              <button onClick={()=>setLang('en')} className={`rounded px-2 py-1 border ${lang==='en'?'bg-neutral-200 dark:bg-neutral-800':''}`}>EN</button>
            </div>
            <button onClick={onLogout} className="ml-4 rounded px-3 py-1 border border-neutral-300 dark:border-neutral-700">{t('logout')}</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
