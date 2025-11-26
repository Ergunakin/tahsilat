import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signUp({ email, password })
    if (signErr || !data.user) {
      setError(signErr?.message ?? 'Kayıt hatası')
      setLoading(false)
      return
    }
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({ name: companyName, slug, email })
      .select('*')
      .single()
    if (compErr || !company) {
      setError(compErr?.message ?? 'Şirket oluşturma hatası')
      setLoading(false)
      return
    }
    await supabase.from('users').insert({
      email,
      full_name: email.split('@')[0],
      role: 'admin',
      company_id: company.id,
    })
    setLoading(false)
    window.location.assign(`/${slug}/dashboard`)
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-96 space-y-3">
        <h2 className="text-xl font-semibold">Kayıt</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Şirket adı" className="w-full border rounded px-3 py-2" />
        <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="Slug (ör. acme)" className="w-full border rounded px-3 py-2" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifre" className="w-full border rounded px-3 py-2" />
        <button disabled={loading} className="w-full rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{loading?'Kaydediliyor...':'Kayıt Ol'}</button>
      </form>
    </div>
  )
}
