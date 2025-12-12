import { Link } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import reactLogo from '@/assets/react.svg'
import { useState } from 'react'
import { useI18n } from '@/i18n'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { toggleTheme, isDark } = useTheme()
  const [slug, setSlug] = useState('')
  const { t, lang, setLang } = useI18n()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const go = async () => {
    setError(null)
    if (!slug.trim()) return
    setLoading(true)
    const { data: cid } = await supabase
      .rpc('get_company_id_by_slug', { s: slug.trim() })
    setLoading(false)
    if (!cid) { setError(t('company_not_found')); return }
    window.location.assign(`/${slug.trim()}/dashboard`)
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="text-center space-y-4">
        <img src={reactLogo} alt="React" className="mx-auto h-16 w-16 animate-spin" />
        <div className="flex items-center justify-center gap-3">
          <button onClick={()=>setLang('tr')} className={`rounded px-2 py-1 border ${lang==='tr'?'bg-neutral-200 dark:bg-neutral-800':''}`}>TR</button>
          <button onClick={()=>setLang('en')} className={`rounded px-2 py-1 border ${lang==='en'?'bg-neutral-200 dark:bg-neutral-800':''}`}>EN</button>
        </div>
        <h1 className="text-2xl font-semibold">{t('app_title')}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('app_start_hint')}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/demo" className="rounded-md px-4 py-2 bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 hover:opacity-90 transition">{t('demo')}</Link>
          <button onClick={toggleTheme} className="rounded-md px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition">
            {isDark ? t('theme_toggle_light') : t('theme_toggle_dark')}
          </button>
        </div>
        <div className="mx-auto max-w-sm space-y-2">
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder={t('slug_placeholder')} className="w-full border rounded px-3 py-2" />
          <button onClick={go} disabled={!slug || loading} className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-50">{loading ? t('checking') : t('goto_dashboard')}</button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link to="/login" className="underline">{t('login')}</Link>
          <Link to="/register" className="underline">{t('register')}</Link>
        </div>
      </div>
    </div>
  )
}
