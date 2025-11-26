import { Link } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import reactLogo from '@/assets/react.svg'
import { useState } from 'react'

export default function Home() {
  const { toggleTheme, isDark } = useTheme()
  const [slug, setSlug] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="text-center space-y-4">
        <img src={reactLogo} alt="React" className="mx-auto h-16 w-16 animate-spin" />
        <h1 className="text-2xl font-semibold">Yeni Proje</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Başlamak için aşağıdaki seçenekleri kullanın.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/demo" className="rounded-md px-4 py-2 bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 hover:opacity-90 transition">Demo</Link>
          <button onClick={toggleTheme} className="rounded-md px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition">
            Temayı {isDark ? 'açık' : 'koyu'} yap
          </button>
        </div>
        <div className="mx-auto max-w-sm space-y-2">
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="Şirket slug" className="w-full border rounded px-3 py-2" />
          <Link to={`/${slug}/dashboard`} className="block rounded px-4 py-2 bg-blue-600 text-white">Şirket panosuna git</Link>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link to="/login" className="underline">Giriş</Link>
          <Link to="/register" className="underline">Kayıt</Link>
        </div>
      </div>
    </div>
  )
}
