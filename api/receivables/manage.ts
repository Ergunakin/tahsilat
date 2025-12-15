import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

function normalizeCurrency(c: string) {
  const k = (c || '').trim().toUpperCase()
  if (k === 'TL' || k === 'TRY') return 'TL'
  if (k === 'USD') return 'USD'
  if (k === 'EUR') return 'EUR'
  return k
}

function excelSerialToISODate(n: number) {
  const ms = Math.round((n - 25569) * 86400 * 1000)
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeDate(v: any) {
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
  if (/^\d+$/.test(s)) return excelSerialToISODate(Number(s))
  return null as any
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { action } = req.body || {}
  if (!action) return res.status(400).json({ error: 'Missing action' })
  try {
    if (action === 'delete') {
      const { company_id, id } = req.body || {}
      if (!company_id || !id) return res.status(400).json({ error: 'Missing company_id or id' })
      const { error } = await admin
        .from('debts')
        .delete()
        .eq('company_id', company_id)
        .eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ id })
    }
    if (action === 'update') {
      const { company_id, id } = req.body || {}
      if (!company_id || !id) return res.status(400).json({ error: 'Missing company_id or id' })
      const customer_name = req.body.customer_name as string | undefined
      const due_date = req.body.due_date as string | number | Date | undefined
      const amount = Number(req.body.amount)
      const currencyRaw = req.body.currency as string | undefined
      const receivable_type = req.body.receivable_type as string | undefined
      const seller_id = req.body.seller_id as string | undefined
      const seller_name = req.body.seller_name as string | undefined
      const patch: any = {}
      if (!isNaN(amount) && amount > 0) patch.amount = amount
      if (currencyRaw) {
        const cKey = normalizeCurrency(currencyRaw)
        const pgCurrency = cKey === 'TL' ? 'TRY' : cKey
        patch.currency = pgCurrency
      }
      if (receivable_type) patch.description = `type=${receivable_type}`
      if (due_date != null) {
        const d = normalizeDate(due_date)
        if (!d) return res.status(400).json({ error: 'Invalid due_date' })
        patch.due_date = d
      }
      if (seller_id || seller_name) {
        let sid = seller_id
        if (!sid && seller_name) {
          const { data: sRow } = await admin
            .from('users')
            .select('id')
            .eq('company_id', company_id)
            .ilike('full_name', seller_name)
            .maybeSingle()
          sid = sRow?.id as string | undefined
        }
        if (sid) patch.seller_id = sid
      }
      if (customer_name) {
        const { data: cRow } = await admin
          .from('customers')
          .select('id')
          .eq('company_id', company_id)
          .eq('name', customer_name.trim())
          .maybeSingle()
        let cid = cRow?.id as string | undefined
        if (!cid) {
          const { data: created, error: custErr } = await admin
            .from('customers')
            .insert({ company_id, name: customer_name.trim() })
            .select('id')
            .single()
          if (custErr || !created) return res.status(500).json({ error: custErr?.message || 'Customer create failed' })
          cid = created.id
        }
        patch.customer_id = cid
      }
      if (Object.keys(patch).length === 0) return res.status(200).json({ id, ok: true })
      const { data, error } = await admin
        .from('debts')
        .update(patch)
        .eq('company_id', company_id)
        .eq('id', id)
        .select('id,customer_id,amount,currency,due_date,seller_id,status,description,created_at')
        .single()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ item: data })
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

