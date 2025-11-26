import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else window.location.assign('/')
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-80 space-y-3">
        <h2 className="text-xl font-semibold">Giriş</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifre" className="w-full border rounded px-3 py-2" />
        <button disabled={loading} className="w-full rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{loading?'Gönderiliyor...':'Giriş Yap'}</button>
      </form>
    </div>
  )
}

