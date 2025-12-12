import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/i18n'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) {
      setLoading(false)
      window.location.assign('/')
      return
    }
    const { data: userRow } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', uid)
      .maybeSingle()
    if (!userRow?.company_id) {
      setLoading(false)
      window.location.assign('/')
      return
    }
    const { data: company } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', userRow.company_id)
      .maybeSingle()
    setLoading(false)
    const slug = company?.slug
    window.location.assign(slug ? `/${slug}/dashboard` : '/')
  }
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <Link to="/" className="absolute left-4 top-4 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <ArrowLeft className="h-4 w-4" />
        <span>{t('app_title')}</span>
      </Link>
      <form onSubmit={onSubmit} className="w-80 space-y-3">
        <h2 className="text-xl font-semibold">{t('login')}</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('email')} className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('password')} className="w-full border rounded px-3 py-2" />
        <button disabled={loading} className="w-full rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{loading?t('logging_in'):t('login_submit')}</button>
      </form>
    </div>
  )
}
