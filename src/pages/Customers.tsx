import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/stores/tenant'
import { useI18n, formatDateDisplay } from '@/i18n'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  total_debt: number
  overdue_debt: number
  created_at: string
}

export default function Customers() {
  const { company } = useTenant()
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const { t, lang } = useI18n()
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, Record<string, number>>>({})
  const [overdueByCurrency, setOverdueByCurrency] = useState<Record<string, Record<string, number>>>({})
  useEffect(() => {
    const load = async () => {
      if (!company?.id) return
      setLoading(true)
      try {
        const { data } = await supabase
          .from('customers')
          .select('id,name,email,phone,total_debt,overdue_debt,created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
        setItems(data ?? [])
        const { data: totalsRows } = await supabase
          .rpc('get_customer_currency_totals', { p_company_id: company.id })
        let totals: Record<string, Record<string, number>> = {}
        let overdue: Record<string, Record<string, number>> = {}
        if (totalsRows && totalsRows.length > 0) {
          (totalsRows ?? []).forEach((r: any) => {
            const cid = r.customer_id as string
            const cur = r.currency as string
            const tot = Number(r.total) || 0
            const ov = Number(r.overdue_total) || 0
            if (!totals[cid]) totals[cid] = {}
            totals[cid][cur] = (totals[cid][cur] || 0) + tot
            if (!overdue[cid]) overdue[cid] = {}
            overdue[cid][cur] = (overdue[cid][cur] || 0) + ov
          })
        } else {
          const { data: debts } = await supabase
            .from('debts')
            .select('customer_id,currency,remaining_amount,due_date,status')
            .eq('company_id', company.id)
          totals = {}
          overdue = {}
          const now = Date.now()
          (debts ?? []).forEach((d: any) => {
            const cid = d.customer_id as string
            const cur = d.currency as string
            const amt = Number(d.remaining_amount) || 0
            if (!totals[cid]) totals[cid] = {}
            if (!totals[cid][cur]) totals[cid][cur] = 0
            totals[cid][cur] += amt
            const dueTs = d.due_date ? new Date(d.due_date).getTime() : 0
            const isActive = d.status === 'active' || d.status === 'partial'
            if (isActive && dueTs && dueTs < now) {
              if (!overdue[cid]) overdue[cid] = {}
              if (!overdue[cid][cur]) overdue[cid][cur] = 0
              overdue[cid][cur] += amt
            }
          })
        }
        setTotalsByCurrency(totals)
        setOverdueByCurrency(overdue)
      } catch {
        setTotalsByCurrency({})
        setOverdueByCurrency({})
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [company?.id])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('customers_title')}</h1>
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="text-left p-2">{t('customers_name')}</th>
              <th className="text-left p-2">{t('customers_email')}</th>
              <th className="text-left p-2">{t('customers_phone')}</th>
              <th className="text-left p-2">{t('customers_total_debt')}</th>
              <th className="text-left p-2">{t('customers_overdue_debt')}</th>
              <th className="text-left p-2">{t('customers_created')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-2" colSpan={6}>{t('loading')}</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-2" colSpan={6}>{t('empty_list')}</td></tr>
            ) : items.map(c => (
              <tr key={c.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.email ?? '—'}</td>
                <td className="p-2">{c.phone ?? '—'}</td>
                <td className="p-2">{
                  (() => {
                    const m = totalsByCurrency[c.id] || {}
                    const entries = Object.entries(m)
                    if (entries.length === 0) return '—'
                    return entries.map(([cur, amt]) => `${cur} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('; ')
                  })()
                }</td>
                <td className="p-2">{
                  (() => {
                    const m = overdueByCurrency[c.id] || {}
                    const entries = Object.entries(m)
                    if (entries.length === 0) return '—'
                    return entries.map(([cur, amt]) => `${cur} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('; ')
                  })()
                }</td>
                <td className="p-2">{formatDateDisplay(c.created_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
