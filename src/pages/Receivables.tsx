import { useI18n, formatDateDisplay } from '@/i18n'
import { useTenant } from '@/stores/tenant'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

type Currency = 'USD' | 'EUR' | 'TL'
type DebtType = 'Senet' | 'Çek' | 'Havale'

interface SellerOpt { id: string; full_name: string }
interface DebtRow { id: string; customer_id: string; customer_name?: string; amount: number; currency: string; due_date: string; seller_id?: string | null; seller_name?: string; status: string; description?: string; created_at?: string }

export default function Receivables() {
  const { t, lang } = useI18n()
  const { company } = useTenant()
  const [customerName, setCustomerName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('TL')
  const [debtType, setDebtType] = useState<DebtType>('Senet')
  const [sellerId, setSellerId] = useState('')
  const [txnDate, setTxnDate] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [sellers, setSellers] = useState<SellerOpt[]>([])
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [bulkItems, setBulkItems] = useState<any[]>([])
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<any[]>([])

  useEffect(() => {
    const loadSellers = async () => {
      if (!company?.id) return
      const { data } = await supabase
        .from('users')
        .select('id,full_name,role')
        .eq('company_id', company.id)
        .in('role', ['seller'])
        .order('full_name', { ascending: true })
      setSellers((data as any[] || []).map(u => ({ id: u.id, full_name: u.full_name })))
    }
    loadSellers()
  }, [company?.id])

  useEffect(() => {
    const loadDebts = async () => {
      if (!company?.id) return
      const { data } = await supabase
        .from('debts')
        .select('id,customer_id,amount,currency,due_date,seller_id,status,description,created_at')
        .eq('company_id', company.id)
        .order('due_date', { ascending: true })
      const rows = (data as any[] || []) as DebtRow[]
      const custIds = Array.from(new Set(rows.map(r => r.customer_id).filter(Boolean))) as string[]
      const sellerIds = Array.from(new Set(rows.map(r => r.seller_id).filter(Boolean))) as string[]
      let custMap: Record<string,string> = {}
      let sellerMap: Record<string,string> = {}
      if (custIds.length) {
        const { data: custs } = await supabase
          .from('customers')
          .select('id,name')
          .in('id', custIds)
        custMap = Object.fromEntries((custs || []).map(c => [c.id, c.name]))
      }
      if (sellerIds.length) {
        const { data: us } = await supabase
          .from('users')
          .select('id,full_name')
          .in('id', sellerIds)
        sellerMap = Object.fromEntries((us || []).map(u => [u.id, u.full_name]))
      }
      setDebts(rows.map(r => ({ ...r, customer_name: custMap[r.customer_id], seller_name: r.seller_id ? sellerMap[r.seller_id] : undefined })))
    }
    loadDebts()
  }, [company?.id])

  const [settingCurrencies, setSettingCurrencies] = useState<string[]>(['TL','USD','EUR'])
  const [settingTypes, setSettingTypes] = useState<string[]>(['Senet','Çek','Havale'])
  useEffect(() => {
    const loadSettings = async () => {
      if (!company?.id) return
      const { data } = await supabase
        .from('company_settings')
        .select('currencies,receivable_types')
        .eq('company_id', company.id)
        .maybeSingle()
      if (data) {
        if (Array.isArray(data.currencies) && data.currencies.length) {
          const uniqueCurr = Array.from(new Set((data.currencies as string[]).map(s => s.trim())))
          setSettingCurrencies(uniqueCurr)
        }
        if (Array.isArray(data.receivable_types) && data.receivable_types.length) {
          const uniqueTypes = Array.from(new Set((data.receivable_types as string[]).map(s => s.trim())))
          setSettingTypes(uniqueTypes)
        }
      }
    }
    loadSettings()
  }, [company?.id])
  const currencies: string[] = useMemo(() => settingCurrencies, [settingCurrencies])
  const debtTypes: string[] = useMemo(() => settingTypes, [settingTypes])
  const translateType = (ty: string) => {
    const k = ty.trim().toLowerCase()
    if (k === 'senet') return t('receivable_type_senet')
    if (k === 'çek') return t('receivable_type_cek')
    if (k === 'havale') return t('receivable_type_havale')
    return ty
  }
  const typesForSelect = useMemo(() => Array.from(new Set(debtTypes.map(s => s.trim()))), [debtTypes])

  const downloadTemplate = () => {
    const typeOptions = (typesForSelect && typesForSelect.length)
      ? typesForSelect.map(translateType).join(' | ')
      : [translateType('Senet'), translateType('Çek'), translateType('Havale')].join(' | ')
    const currencyOptions = (currencies && currencies.length)
      ? currencies.join(' | ')
      : 'TL | USD | EUR'
    const ws = XLSX.utils.json_to_sheet([
      {
        [t('customer')]: t('customer'),
        [t('due_date')]: '2025-01-01',
        [t('amount')]: '1000.00',
        [t('currency')]: currencyOptions,
        [t('debt_type')]: typeOptions,
        [t('seller')]: 'Satış Temsilcisi Adı',
        [t('transaction_date')]: '2025-01-01'
      }
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ReceivablesTemplate')
    XLSX.writeFile(wb, 'alacak_sablon.xlsx')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws)
    const mapped = rows.map((r: any) => ({
      customer_name: r[t('customer')] || r['Müşteri'] || r['Customer'] || r['customer'],
      due_date: r[t('due_date')] || r['Vade Tarihi'] || r['Due Date'] || r['due_date'],
      amount: r[t('amount')] || r['Alacak Tutarı'] || r['Receivable Amount'] || r['amount'],
      currency: r[t('currency')] || r['Para Birimi'] || r['Currency'] || r['currency'],
      receivable_type: r[t('debt_type')] || r['Alacak Tipi'] || r['Receivable Type'] || r['type'],
      seller: r[t('seller')] || r['Satış Temsilcisi'] || r['Sales Rep'] || r['seller'],
      txn_date: r[t('transaction_date')] || r['İşlem Tarihi (opsiyonel)'] || r['Transaction Date (optional)'] || r['transaction_date']
    }))
    setBulkItems(mapped)
  }

  const submitBulk = async () => {
    setBulkMsg(null)
    if (!company?.id) { setBulkMsg('Şirket yok'); return }
    const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
    let url = '/api/receivables/bulk'
    if (import.meta.env.DEV) {
      if (apiBase && apiBase.length > 0) {
        url = `${apiBase}/api/receivables/bulk`
      } else {
        setBulkMsg('Geliştirme için VITE_API_BASE_URL ayarlayın veya Vite proxy kullanın')
        return
      }
    }
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: company.id, items: bulkItems })
    })
    const ct = resp.headers.get('content-type') || ''
    const isJson = ct.includes('application/json')
    const json = isJson ? await resp.json() : { error: await resp.text() }
    if (!resp.ok) { setBulkMsg(json.error || 'Hata'); return }
    setBulkResult(json.items || [])
    // refresh debts
    const { data } = await supabase
      .from('debts')
      .select('id,customer_id,amount,currency,due_date,seller_id,status,description,created_at')
      .eq('company_id', company.id)
      .order('due_date', { ascending: true })
    const rows = (data as any[] || []) as DebtRow[]
    setDebts(rows)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!company?.id) { setMsg('Şirket yok'); return }
    if (!customerName || !dueDate || !amount || !currency || !debtType || !sellerId) { setMsg('Zorunlu alanları doldurun'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setMsg('Tutar geçersiz'); return }
    const allowed = ['USD','EUR','TL']
    if (!allowed.includes(currency)) { setMsg('Para birimi desteklenmiyor'); return }
    const pgCurrency = currency === 'TL' ? 'TRY' : currency
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', company.id)
      .eq('name', customerName.trim())
      .maybeSingle()
    let customerId = existing?.id as string | undefined
    if (!customerId) {
      const { data: created, error: custErr } = await supabase
        .from('customers')
        .insert({ company_id: company.id, name: customerName.trim(), assigned_seller_id: sellerId })
        .select('id')
        .single()
      if (custErr || !created) { setMsg(custErr?.message || 'Müşteri oluşturulamadı'); return }
      customerId = created.id
    }
    const { data: debtRow, error: debtErr } = await supabase
      .from('debts')
      .insert({
        customer_id: customerId,
        company_id: company.id,
        amount: amt,
        currency: pgCurrency,
        due_date: dueDate,
        description: `type=${debtType}`,
        seller_id: sellerId,
        remaining_amount: amt,
        status: 'active',
      })
      .select('id,customer_id,amount,currency,due_date,seller_id,status,description,created_at')
      .single()
    if (debtErr) { setMsg(debtErr.message); return }
    setMsg(t('debt_saved'))
    if (debtRow) {
      setDebts(prev => [{
        ...(debtRow as any),
        customer_name: customerName.trim(),
        seller_name: sellers.find(s => s.id === sellerId)?.full_name,
      }, ...prev])
    }
    setCustomerName(''); setDueDate(''); setAmount(''); setCurrency('TL'); setDebtType('Senet'); setSellerId(''); setTxnDate('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('nav_receivables')}</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('debts_list_title')}</h2>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="text-left p-2">{t('customer')}</th>
                <th className="text-left p-2">{t('due_date')}</th>
                <th className="text-left p-2">{t('amount')}</th>
                <th className="text-left p-2">{t('currency')}</th>
                <th className="text-left p-2">{t('seller')}</th>
                <th className="text-left p-2">{t('debt_type')}</th>
                <th className="text-left p-2">{t('debt_status')}</th>
                <th className="text-left p-2">{t('created_at')}</th>
              </tr>
            </thead>
            <tbody>
              {debts.length === 0 ? (
                <tr><td className="p-2" colSpan={8}>—</td></tr>
              ) : debts.map(d => (
                <tr key={d.id} className={cn('border-t border-neutral-200 dark:border-neutral-800', (new Date(d.due_date).getTime() < Date.now()) ? 'text-red-600' : 'text-green-600')}>
                  <td className="p-2">{d.customer_name || d.customer_id}</td>
                  <td className="p-2">{formatDateDisplay(d.due_date, lang)}</td>
                  <td className="p-2">{d.amount.toFixed(2)}</td>
                  <td className="p-2">{d.currency}</td>
                  <td className="p-2">{d.seller_name || '—'}</td>
                  <td className="p-2">{(() => { const ty = (d.description || '').replace('type=',''); return ty ? translateType(ty) : '—' })()}</td>
                  <td className="p-2">{d.status}</td>
                  <td className="p-2">{d.created_at ? formatDateDisplay(d.created_at, lang) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('receivables_bulk_title')}</h2>
        <div className="flex items-center gap-3">
          <button onClick={downloadTemplate} className="rounded px-3 py-2 border">{t('template_download')}</button>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
          <button onClick={submitBulk} disabled={bulkItems.length===0} className="rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{t('bulk_receivables_create')}</button>
        </div>
        {bulkMsg && <div className="text-sm text-red-600">{bulkMsg}</div>}
        {bulkItems.length > 0 && (
          <div className="rounded border p-3">
            <div className="font-medium mb-2">{t('preview')} ({bulkItems.length})</div>
            <ul className="text-sm space-y-1">
              {bulkItems.map((i, idx) => (
                <li key={idx}>{i.customer_name} - {i.amount} {i.currency} - {i.receivable_type}</li>
              ))}
            </ul>
          </div>
        )}
        {bulkResult.length > 0 && (
          <div className="rounded border p-3">
            <div className="font-medium mb-2">{t('results')} ({bulkResult.length})</div>
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="text-left p-2">{t('customer')}</th>
                  <th className="text-left p-2">{t('due_date')}</th>
                  <th className="text-left p-2">{t('amount')}</th>
                  <th className="text-left p-2">{t('currency')}</th>
                  <th className="text-left p-2">{t('debt_type')}</th>
                  <th className="text-left p-2">{t('assign_error')}</th>
                </tr>
              </thead>
              <tbody>
                {bulkResult.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="p-2">{r.customer_name || '—'}</td>
                    <td className="p-2">{r.due_date ? formatDateDisplay(r.due_date, lang) : '—'}</td>
                    <td className="p-2">{r.amount ?? '—'}</td>
                    <td className="p-2">{r.currency ?? '—'}</td>
                    <td className="p-2">{r.description ? String(r.description).replace('type=','') : '—'}</td>
                    <td className="p-2 text-red-600">{r.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder={t('customer')} className="border rounded px-3 py-2" />
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">{t('due_date')}</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="border rounded px-3 py-2" />
          </div>
          <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder={t('amount')} className="border rounded px-3 py-2" />
          <select value={currency} onChange={e=>setCurrency(e.target.value as Currency)} className="border rounded px-3 py-2">
            <option value="">{t('select_placeholder')}</option>
            {currencies.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select value={debtType} onChange={e=>setDebtType(e.target.value as DebtType)} className="border rounded px-3 py-2">
            <option value="">{t('select_placeholder')}</option>
            {typesForSelect.map(dt => (
              <option key={dt} value={dt}>{translateType(dt)}</option>
            ))}
          </select>
          <select value={sellerId} onChange={e=>setSellerId(e.target.value)} className="border rounded px-3 py-2">
            <option value="">{t('seller')}</option>
            {sellers.map(s => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
          </select>
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">{t('transaction_date')}</label>
            <input type="date" value={txnDate} onChange={e=>setTxnDate(e.target.value)} className="border rounded px-3 py-2" />
          </div>
        </div>
        <button className="rounded px-4 py-2 bg-neutral-900 text-white">{t('save_debt')}</button>
        {msg && <div className="text-sm text-blue-600">{msg}</div>}
      </form>
    </div>
  )
}
