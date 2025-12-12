import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/i18n'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signUp({ email, password })
    if (signErr || !data.user) {
      if (signErr && /already/i.test(signErr.message)) {
        const { error: loginErr2 } = await supabase.auth.signInWithPassword({ email, password })
        if (loginErr2) {
          setError('Bu e‑posta zaten kayıtlı. Lütfen Giriş yapın veya şifre sıfırlayın.')
          setLoading(false)
          return
        }
      } else {
        setError(signErr?.message ?? 'Kayıt hatası')
        setLoading(false)
        return
      }
    }
    // Sign in to ensure authenticated role for subsequent inserts
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    if (loginErr) {
      setError(loginErr.message.includes('Email not confirmed') ? 'E-posta doğrulaması gerekli. Lütfen e-postanı kontrol et.' : loginErr.message)
      setLoading(false)
      return
    }
    const { error: compErr } = await supabase
      .from('companies')
      .insert({ name: companyName, slug, email })
    if (compErr) {
      setError(compErr.message)
      setLoading(false)
      return
    }
    const { data: cid } = await supabase.rpc('get_company_id_by_slug', { s: slug })
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      full_name: email.split('@')[0],
      role: 'admin',
      company_id: cid as string,
    })
    // Update auth user metadata and wait for row visibility
    await supabase.auth.updateUser({ data: { company_id: cid as string, role: 'admin' } })
    let tries = 0
    while (tries < 5) {
      const { data: urow } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()
      if (urow) break
      await new Promise(r => setTimeout(r, 200))
      tries++
    }
    setLoading(false)
    window.location.assign(`/${slug}/dashboard`)
  }
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <Link to="/" className="absolute left-4 top-4 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <ArrowLeft className="h-4 w-4" />
        <span>{t('app_title')}</span>
      </Link>
      <form onSubmit={onSubmit} className="w-96 space-y-3">
        <h2 className="text-xl font-semibold">{t('register')}</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder={t('full_name')} className="w-full border rounded px-3 py-2" />
        <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder={t('slug_placeholder')} className="w-full border rounded px-3 py-2" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('email')} className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('password')} className="w-full border rounded px-3 py-2" />
        <button disabled={loading} className="w-full rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{loading?t('registering'):t('register_submit')}</button>
      </form>
    </div>
  )
}
