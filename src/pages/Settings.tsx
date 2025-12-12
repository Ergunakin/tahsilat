import { useI18n } from '@/i18n'
import { useTenant } from '@/stores/tenant'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const { t } = useI18n()
  const { company } = useTenant()
  const [currenciesInput, setCurrenciesInput] = useState('TL,USD,EUR')
  const [typesInput, setTypesInput] = useState('Senet,Çek,Havale')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!company?.id) return
      const { data } = await supabase
        .from('company_settings')
        .select('currencies,receivable_types')
        .eq('company_id', company.id)
        .maybeSingle()
      if (data) {
        if (data.currencies?.length) setCurrenciesInput((data.currencies as string[]).join(','))
        if (data.receivable_types?.length) setTypesInput((data.receivable_types as string[]).join(','))
      }
    }
    load()
  }, [company?.id])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!company?.id) { setMsg('Şirket yok'); return }
    const currenciesRaw = currenciesInput.split(',').map(s=>s.trim()).filter(Boolean)
    const receivableTypesRaw = typesInput.split(',').map(s=>s.trim()).filter(Boolean)
    const currencies = Array.from(new Set(currenciesRaw.map(s=>s.toUpperCase())))
    const receivable_types = Array.from(new Set(receivableTypesRaw.map(s=>s)))
    const { data: existing } = await supabase
      .from('company_settings')
      .select('company_id')
      .eq('company_id', company.id)
      .maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('company_settings')
        .update({ currencies, receivable_types })
        .eq('company_id', company.id)
      if (error) { setMsg(error.message); return }
    } else {
      const { error } = await supabase
        .from('company_settings')
        .insert({ company_id: company.id, currencies, receivable_types })
      if (error) { setMsg(error.message); return }
    }
    setMsg(t('saved'))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('nav_settings')}</h1>
      <form onSubmit={onSave} className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">{t('settings_currencies_label')}</label>
            <input value={currenciesInput} onChange={e=>setCurrenciesInput(e.target.value)} className="border rounded px-3 py-2" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">{t('settings_receivable_types_label')}</label>
            <input value={typesInput} onChange={e=>setTypesInput(e.target.value)} className="border rounded px-3 py-2" />
          </div>
        </div>
        <button className="rounded px-4 py-2 bg-neutral-900 text-white">{t('save')}</button>
        {msg && <div className="text-sm text-blue-600">{msg}</div>}
      </form>
    </div>
  )
}
