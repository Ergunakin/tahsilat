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
  const [currentRole, setCurrentRole] = useState<string>('')
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
  const [sortConfig, setSortConfig] = useState<{ key?: string; type?: 'alpha'|'numeric'; dir?: 'asc'|'desc' }>({ key: undefined, type: undefined, dir: undefined })
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterType, setFilterType] = useState('')
  const [bulkItems, setBulkItems] = useState<any[]>([])
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<any[]>([])

  useEffect(() => {
    const loadCurrentRole = async () => {
      try {
        const { data: u } = await supabase.auth.getUser()
        const uid = u?.user?.id
        if (uid && company?.id) {
          const { data: row } = await supabase
            .from('users')
            .select('role')
            .eq('company_id', company.id)
            .eq('id', uid)
            .maybeSingle()
          if (row?.role) setCurrentRole(row.role as string)
        }
      } catch {}
    }
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
    loadCurrentRole()
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

  const getTypeFromDesc = (desc?: string) => {
    const ty = (desc || '').replace('type=', '')
    return ty
  }

  const excelSerialToISODate = (n: number) => {
    const ms = Math.round((n - 25569) * 86400 * 1000)
    const d = new Date(ms)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const normalizeDate = (v: any) => {
    if (v == null) return null as any
    if (typeof v === 'number' && isFinite(v)) return excelSerialToISODate(v)
    if (v instanceof Date) {
      const y = v.getUTCFullYear()
      const m = String(v.getUTCMonth() + 1).padStart(2, '0')
      const day = String(v.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const s = String(v).trim()
    if (!s) return null as any
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    if(/^\d+$/.test(s)) return excelSerialToISODate(Number(s))
    if (/^\d{1,2}[\/.]\d{1,2}[\/.]\d{4}$/.test(s)) {
      const sep = s.includes('.') ? '.' : '/'
      const parts = s.split(sep)
      const d = parts[0]
      const m = parts[1]
      const y = parts[2]
      const mm = String(Number(m)).padStart(2, '0')
      const dd = String(Number(d)).padStart(2, '0')
      return `${y}-${mm}-${dd}`
    }
    if (/^\d{4}[\/.]\d{1,2}[\/.]\d{1,2}$/.test(s)) {
      const sep = s.includes('.') ? '.' : '/'
      const parts = s.split(sep)
      const y = parts[0]
      const m = parts[1]
      const d = parts[2]
      const mm = String(Number(m)).padStart(2, '0')
      const dd = String(Number(d)).padStart(2, '0')
      return `${y}-${mm}-${dd}`
    }
    return null as any
  }

  const filteredDebts = useMemo(() => {
    const fc = filterCustomer.trim().toLowerCase()
    const fs = filterSeller.trim().toLowerCase()
    const ft = filterType.trim().toLowerCase()
    if (!fc && !fs && !ft) return debts
    return debts.filter(d => {
      const cust = (d.customer_name || d.customer_id || '').toString().toLowerCase()
      const sell = (d.seller_name || '').toString().toLowerCase()
      const tyRaw = getTypeFromDesc(d.description) || ''
      const tyDisp = translateType(tyRaw).toString().toLowerCase()
      const okC = fc ? cust.includes(fc) : true
      const okS = fs ? sell.includes(fs) : true
      const okT = ft ? (tyRaw.toLowerCase().includes(ft) || tyDisp.includes(ft)) : true
      return okC && okS && okT
    })
  }, [debts, filterCustomer, filterSeller, filterType])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCustomer, setEditCustomer] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCurrency, setEditCurrency] = useState('TL')
  const [editType, setEditType] = useState('Senet')
  const [editSellerId, setEditSellerId] = useState('')
  const sortedDebts = useMemo(() => {
    if (!sortConfig.key || !sortConfig.dir || !sortConfig.type) return filteredDebts
    const key = sortConfig.key
    const type = sortConfig.type
    const dir = sortConfig.dir
    const val = (d: DebtRow): any => {
      if (key === 'customer') return d.customer_name || d.customer_id || ''
      if (key === 'due_date') return d.due_date ? new Date(d.due_date).getTime() : 0
      if (key === 'amount') return typeof d.amount === 'number' ? d.amount : Number(d.amount) || 0
      if (key === 'currency') return d.currency || ''
      if (key === 'seller') return d.seller_name || ''
      if (key === 'type') return getTypeFromDesc(d.description)
      if (key === 'status') return d.status || ''
      if (key === 'created_at') return d.created_at ? new Date(d.created_at).getTime() : 0
      return ''
    }
    const arr = [...filteredDebts]
    arr.sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      let cmp = 0
      if (type === 'alpha') {
        cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      } else {
        const na = Number(av) || 0
        const nb = Number(bv) || 0
        cmp = na - nb
      }
      return dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filteredDebts, sortConfig])

  const downloadTemplate = () => {
    const dueColLabel = lang === 'tr' ? `${t('due_date')} (GG.AA.YYYY)` : t('due_date')
    const txnColLabel = lang === 'tr' ? `${t('transaction_date')} (GG.AA.YYYY)` : t('transaction_date')
    const typeOptions = (typesForSelect && typesForSelect.length)
      ? typesForSelect.map(translateType).join(' | ')
      : [translateType('Senet'), translateType('Çek'), translateType('Havale')].join(' | ')
    const currencyOptions = (currencies && currencies.length)
      ? currencies.join(' | ')
      : 'TL | USD | EUR'
    const dateSample = lang === 'tr' ? '01.01.2025' : '2025-01-01'
    const ws = XLSX.utils.json_to_sheet([
      {
        [t('customer')]: t('customer'),
        [dueColLabel]: dateSample,
        [t('amount')]: '1000.00',
        [t('currency')]: currencyOptions,
        [t('debt_type')]: typeOptions,
        [t('seller')]: 'Satış Temsilcisi Adı',
        [txnColLabel]: dateSample
      }
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ReceivablesTemplate')
    const filename = lang === 'tr' ? 'Alacak Şablon.xls' : 'Receivables Template.xls'
    XLSX.writeFile(wb, filename)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws)
    const dueColLabel = lang === 'tr' ? `${t('due_date')} (GG.AA.YYYY)` : t('due_date')
    const txnColLabel = lang === 'tr' ? `${t('transaction_date')} (GG.AA.YYYY)` : t('transaction_date')
    const mapped = rows.map((r: any) => ({
      customer_name: r[t('customer')] || r['Müşteri'] || r['Customer'] || r['customer'],
      due_date: normalizeDate(r[dueColLabel] || r[t('due_date')] || r['Vade Tarihi'] || r['Due Date'] || r['due_date']),
      amount: r[t('amount')] || r['Alacak Tutarı'] || r['Receivable Amount'] || r['amount'],
      currency: r[t('currency')] || r['Para Birimi'] || r['Currency'] || r['currency'],
      receivable_type: r[t('debt_type')] || r['Alacak Tipi'] || r['Receivable Type'] || r['type'],
      seller: r[t('seller')] || r['Satış Temsilcisi'] || r['Sales Rep'] || r['seller'],
      txn_date: normalizeDate(r[txnColLabel] || r[t('transaction_date')] || r['İşlem Tarihi (opsiyonel)'] || r['Transaction Date (optional)'] || r['transaction_date'])
    }))
    setBulkItems(mapped)
  }

  const bulkPreview = useMemo(() => {
    return bulkItems.map((i: any) => {
      const name = String(i.customer_name || '').trim()
      const dd = normalizeDate(i.due_date)
      let action: 'insert' | 'update' | 'no_change' = 'insert'
      let diffs: string[] = []
      const existing = debts.find(d => (d.customer_name || '').trim() === name && d.due_date === dd)
      if (existing) {
        action = 'update'
        const amtNew = Number(i.amount)
        const amtOld = Number(existing.amount)
        if (isFinite(amtNew) && amtNew !== amtOld) diffs.push('amount')
        const currNewKey = String(i.currency || '').trim().toUpperCase()
        const currNewPg = (currNewKey === 'TL' || currNewKey === 'TRY') ? 'TRY' : currNewKey
        const currOld = String(existing.currency || '').trim().toUpperCase()
        if (currNewPg && currNewPg !== currOld) diffs.push('currency')
        const typeNew = String(i.receivable_type || '').trim()
        const typeOld = String(getTypeFromDesc(existing.description) || '').trim()
        if (typeNew && typeNew !== typeOld) diffs.push('type')
        const sellerNew = String(i.seller || '').trim()
        const sellerOld = String(existing.seller_name || '').trim()
        if (sellerNew && sellerNew !== sellerOld) diffs.push('seller')
        if (diffs.length === 0) action = 'no_change'
      }
      return { ...i, due_date: dd, _action: action, _diffs: diffs }
    })
  }, [bulkItems, debts])

  const submitBulk = async () => {
    setBulkMsg(null)
    if (!company?.id) { setBulkMsg('Şirket yok'); return }
    const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined
    const apiBase = rawBase ? rawBase.replace(/\/+$/, '') : undefined
    let url = '/api/receivables/bulk'
    if (import.meta.env.DEV) {
      if (apiBase && apiBase.length > 0) {
        url = `${apiBase}/api/receivables/bulk`
      } else {
        setBulkMsg('Geliştirme için VITE_API_BASE_URL ayarlayın veya Vite proxy kullanın')
        return
      }
    }
    try {
      const itemsNormalized = bulkItems.map(i => ({
        ...i,
        due_date: normalizeDate(i.due_date),
        txn_date: normalizeDate(i.txn_date)
      }))
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, items: itemsNormalized })
      })
      const ct = resp.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const json = isJson ? await resp.json() : { error: await resp.text() }
      if (!resp.ok) { setBulkMsg(json.error || 'Hata'); return }
      setBulkResult(json.items || [])
    } catch (e: any) {
      setBulkMsg(`Ağ hatası: ${e?.message || 'fetch failed'}`)
      return
    }
    // refresh debts
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
              <th className="text-left p-2">
                {t('customer')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'customer', type: 'alpha', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'customer', type: 'alpha', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('due_date')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'due_date', type: 'numeric', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'due_date', type: 'numeric', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('amount')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'amount', type: 'numeric', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'amount', type: 'numeric', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('currency')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'currency', type: 'alpha', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'currency', type: 'alpha', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('seller')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'seller', type: 'alpha', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'seller', type: 'alpha', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('debt_type')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'type', type: 'alpha', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'type', type: 'alpha', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('debt_status')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'status', type: 'alpha', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'status', type: 'alpha', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2">
                {t('created_at')}
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'created_at', type: 'numeric', dir: 'asc' })}>↑</button>
                  <button className="text-xs" onClick={()=>setSortConfig({ key: 'created_at', type: 'numeric', dir: 'desc' })}>↓</button>
                </span>
              </th>
              <th className="text-left p-2"></th>
              <th className="text-left p-2"></th>
            </tr>
            <tr>
              <th className="text-left p-2"><input value={filterCustomer} onChange={e=>setFilterCustomer(e.target.value)} placeholder={t('customer')} className="border rounded px-2 py-1 w-full" /></th>
              <th className="text-left p-2"></th>
              <th className="text-left p-2"></th>
              <th className="text-left p-2"></th>
              <th className="text-left p-2"><input value={filterSeller} onChange={e=>setFilterSeller(e.target.value)} placeholder={t('seller')} className="border rounded px-2 py-1 w-full" /></th>
              <th className="text-left p-2"><input value={filterType} onChange={e=>setFilterType(e.target.value)} placeholder={t('debt_type')} className="border rounded px-2 py-1 w-full" /></th>
              <th className="text-left p-2"></th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
            <tbody>
              {sortedDebts.length === 0 ? (
                <tr><td className="p-2" colSpan={8}>—</td></tr>
              ) : sortedDebts.map(d => (
                <tr key={d.id} className={cn('border-t border-neutral-200 dark:border-neutral-800', (new Date(d.due_date).getTime() < Date.now()) ? 'text-red-600' : 'text-green-600')}>
                  {editingId === d.id ? (
                    <>
                      <td className="p-2"><input value={editCustomer} onChange={e=>setEditCustomer(e.target.value)} className="border rounded px-2 py-1 w-full" /></td>
                      <td className="p-2"><input type="date" value={editDueDate} onChange={e=>setEditDueDate(e.target.value)} className="border rounded px-2 py-1 w-full" /></td>
                      <td className="p-2"><input value={editAmount} onChange={e=>setEditAmount(e.target.value)} className="border rounded px-2 py-1 w-full" /></td>
                      <td className="p-2"><select value={editCurrency} onChange={e=>setEditCurrency(e.target.value)} className="border rounded px-2 py-1 w-full">{currencies.map(c=>(<option key={c} value={c}>{c}</option>))}</select></td>
                      <td className="p-2"><select value={editType} onChange={e=>setEditType(e.target.value)} className="border rounded px-2 py-1 w-full">{typesForSelect.map(dt => (<option key={dt} value={dt}>{translateType(dt)}</option>))}</select></td>
                      <td className="p-2"><select value={editSellerId} onChange={e=>setEditSellerId(e.target.value)} className="border rounded px-2 py-1 w-full"><option value="">—</option>{sellers.map(s => (<option key={s.id} value={s.id}>{s.full_name}</option>))}</select></td>
                      <td className="p-2"><button className="text-xs rounded px-2 py-1 border" onClick={async ()=>{
                        if (!company?.id) return
                        let url = '/api/receivables/manage'
                        const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined
                        const apiBase = rawBase ? rawBase.replace(/\/+$/, '') : undefined
                        if (import.meta.env.DEV && apiBase && apiBase.length > 0) url = `${apiBase}/api/receivables/manage`
                        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', company_id: company.id, id: d.id, customer_name: editCustomer, due_date: editDueDate, amount: Number(editAmount), currency: editCurrency, receivable_type: editType, seller_id: editSellerId }) })
                        const ct = resp.headers.get('content-type') || ''
                        const isJson = ct.includes('application/json')
                        const json = isJson ? await resp.json() : { error: await resp.text() }
                        if (!resp.ok) { alert(json.error || 'Güncelleme hatası'); return }
                        setEditingId(null)
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
                      }}>Kaydet</button>
                      <button className="text-xs rounded px-2 py-1 border ml-2" onClick={()=>setEditingId(null)}>İptal</button></td>
                      <td className="p-2"></td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{d.customer_name || d.customer_id}</td>
                      <td className="p-2">{formatDateDisplay(d.due_date, lang)}</td>
                      <td className="p-2">{d.amount.toFixed(2)}</td>
                      <td className="p-2">{d.currency}</td>
                      <td className="p-2">{(() => { const ty = getTypeFromDesc(d.description); return ty ? translateType(ty) : '—' })()}</td>
                      <td className="p-2">{d.seller_name || '—'}</td>
                      <td className="p-2">{d.status}</td>
                      <td className="p-2">{d.created_at ? formatDateDisplay(d.created_at, lang) : '—'}</td>
                      <td className="p-2">
                        {(currentRole === 'admin' || currentRole === 'accountant') && (
                          <button className="text-xs rounded px-2 py-1 border" onClick={()=>{ setEditingId(d.id); setEditCustomer(d.customer_name || ''); setEditDueDate(d.due_date || ''); setEditAmount(String(d.amount)); setEditCurrency(String(d.currency).toUpperCase() === 'TRY' ? 'TL' : String(d.currency).toUpperCase()); setEditType(getTypeFromDesc(d.description) || 'Senet'); setEditSellerId(d.seller_id || '') }}>✎</button>
                        )}
                      </td>
                      <td className="p-2">
                        {(currentRole === 'admin' || currentRole === 'accountant') && (
                          <button className="text-xs rounded px-2 py-1 border" onClick={async ()=>{
                            if (!company?.id) return
                            if (!confirm('Silmek istediğinizden emin misiniz?')) return
                            let url = '/api/receivables/manage'
                            const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined
                            const apiBase = rawBase ? rawBase.replace(/\/+$/, '') : undefined
                            if (import.meta.env.DEV && apiBase && apiBase.length > 0) url = `${apiBase}/api/receivables/manage`
                            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', company_id: company.id, id: d.id }) })
                            const ct = resp.headers.get('content-type') || ''
                            const isJson = ct.includes('application/json')
                            const json = isJson ? await resp.json() : { error: await resp.text() }
                            if (!resp.ok) { alert(json.error || 'Silme hatası'); return }
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
                          }}>🗑</button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('receivables_bulk_title')}</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <button onClick={downloadTemplate} className="rounded px-3 py-2 border">{t('template_download')}</button>
          <div className="flex flex-col gap-2">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
            <button onClick={submitBulk} disabled={bulkItems.length===0} className="rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{t('bulk_receivables_create')}</button>
          </div>
        </div>
        {bulkMsg && <div className="text-sm text-red-600">{bulkMsg}</div>}
        {bulkItems.length > 0 && (
          <div className="rounded border p-3">
            <div className="font-medium mb-2">{t('preview')} ({bulkItems.length})</div>
            <ul className="text-sm space-y-1">
              {bulkPreview.map((i: any, idx: number) => (
                <li key={idx}>
                  {i.customer_name} - {i.amount} {i.currency} - {i.receivable_type} — [
                  {i._action === 'insert' ? 'Eklenecek' : i._action === 'update' ? `Güncellenecek: ${i._diffs.length ? i._diffs.join(', ') : '-'}` : 'Değişiklik yok'}
                  ]
                </li>
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
                  <th className="text-left p-2">Mesaj</th>
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
                    <td className="p-2 text-blue-600">{r.message || ''}</td>
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
