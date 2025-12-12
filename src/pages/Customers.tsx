import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/stores/tenant'
import { useI18n } from '@/i18n'

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
  const { t } = useI18n()
  useEffect(() => {
    const load = async () => {
      if (!company?.id) return
      setLoading(true)
      const { data } = await supabase
        .from('customers')
        .select('id,name,email,phone,total_debt,overdue_debt,created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
      setItems(data ?? [])
      setLoading(false)
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
                <td className="p-2">{c.total_debt?.toFixed(2)}</td>
                <td className="p-2">{c.overdue_debt?.toFixed(2)}</td>
                <td className="p-2">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
