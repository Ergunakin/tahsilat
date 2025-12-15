import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

function normalizeCurrency(c: string) {
  const k = (c || '').trim().toUpperCase()
  if (k === 'TL') return 'TL'
  if (k === 'TRY') return 'TL'
  if (k === 'USD') return 'USD'
  if (k === 'EUR') return 'EUR'
  return k
}

function slugifyName(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
  if (v == null) return null
  if (typeof v === 'number' && isFinite(v)) return excelSerialToISODate(v)
  if (v instanceof Date) {
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const day = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/')
    const mm = String(Number(m)).padStart(2, '0')
    const dd = String(Number(d)).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('/')
    const mm = String(Number(m)).padStart(2, '0')
    const dd = String(Number(d)).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
    const [d, m, y] = s.split('.')
    const mm = String(Number(m)).padStart(2, '0')
    const dd = String(Number(d)).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('.')
    const mm = String(Number(m)).padStart(2, '0')
    const dd = String(Number(d)).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  if (/^\d+$/.test(s)) return excelSerialToISODate(Number(s))
  return null
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })

  const { company_id, items } = req.body || {}
  if (!company_id || !Array.isArray(items)) return res.status(400).json({ error: 'Missing company_id or items' })

  const results: any[] = []
  for (const row of items) {
    try {
      const customer_name = row.customer_name || row['Müşteri'] || row['Customer'] || row['customer']
      const due_date = row.due_date || row['Vade Tarihi'] || row['Due Date'] || row['due_date']
      const amount = row.amount || row['Alacak Tutarı'] || row['Receivable Amount'] || row['amount']
      const currencyRaw = row.currency || row['Para Birimi'] || row['Currency'] || row['currency']
      const receivable_type = row.receivable_type || row['Alacak Tipi'] || row['Receivable Type'] || row['type']
      const seller_name = row.seller || row['Satış Temsilcisi'] || row['Sales Rep'] || row['seller']
      const txn_date = row.txn_date || row['İşlem Tarihi (opsiyonel)'] || row['Transaction Date (optional)'] || row['transaction_date']

      if (!customer_name || !due_date || !amount || !currencyRaw || !receivable_type || !seller_name) {
        results.push({ error: 'Missing required fields', customer_name })
        continue
      }
      const currencyKey = normalizeCurrency(String(currencyRaw))
      const pgCurrency = currencyKey === 'TL' ? 'TRY' : currencyKey
      if (!['USD','EUR','TL'].includes(currencyKey)) {
        results.push({ error: 'Unsupported currency', currency: currencyKey, customer_name })
        continue
      }
      const amtNum = Number(amount)
      if (!amtNum || amtNum <= 0) {
        results.push({ error: 'Invalid amount', amount, customer_name })
        continue
      }

      const dueISO = normalizeDate(due_date)
      if (!dueISO) {
        results.push({ error: 'Invalid due_date', due_date, customer_name })
        continue
      }

      // resolve seller id by name within company
      const { data: sellerRow } = await admin
        .from('users')
        .select('id')
        .eq('company_id', company_id)
        .ilike('full_name', seller_name)
        .maybeSingle()
      let seller_id = sellerRow?.id as string | null
      if (!seller_id) {
        const emailLocal = `seller-${slugifyName(String(seller_name))}-${String(company_id).slice(0,8)}`
        const email = `${emailLocal}@example.local`
        const { data: createdSeller, error: sellerErr } = await admin
          .from('users')
          .insert({ email, full_name: String(seller_name).trim(), role: 'seller', company_id })
          .select('id')
          .single()
        if (sellerErr || !createdSeller) {
          results.push({ error: sellerErr?.message || 'Seller create failed', seller_name, customer_name })
          continue
        }
        seller_id = createdSeller.id
      }

      // find or create customer
      const { data: existing } = await admin
        .from('customers')
        .select('id')
        .eq('company_id', company_id)
        .eq('name', customer_name.trim())
        .maybeSingle()
      let customer_id = existing?.id as string | undefined
      if (!customer_id) {
        const { data: created, error: custErr } = await admin
          .from('customers')
          .insert({ company_id, name: customer_name.trim(), assigned_seller_id: seller_id })
          .select('id')
          .single()
        if (custErr || !created) {
          results.push({ error: custErr?.message || 'Customer create failed', customer_name })
          continue
        }
        customer_id = created.id
      }

      // upsert by (customer_id, due_date)
      const { data: existingDebt } = await admin
        .from('debts')
        .select('id,customer_id,amount,currency,due_date,seller_id,status,description,remaining_amount,created_at')
        .eq('company_id', company_id)
        .eq('customer_id', customer_id)
        .eq('due_date', dueISO)
        .limit(1)
      const found = (existingDebt || [])[0]
      if (found) {
        const patch: any = {}
        if (Number(found.amount) !== amtNum) patch.amount = amtNum
        if ((found.currency || '').toUpperCase() !== pgCurrency.toUpperCase()) patch.currency = pgCurrency
        const incomingDesc = `type=${receivable_type}`
        if ((found.description || '') !== incomingDesc) patch.description = incomingDesc
        if ((found.seller_id || null) !== (seller_id || null)) patch.seller_id = seller_id
        if (Object.keys(patch).length) {
          const { error: updErr } = await admin
            .from('debts')
            .update(patch)
            .eq('id', found.id)
          if (updErr) {
            results.push({ error: updErr.message, customer_name })
            continue
          }
        }
        results.push({ ...found, amount: amtNum, currency: pgCurrency, description: `type=${receivable_type}`, seller_id, customer_name, seller_name, _action: 'updated' })
      } else {
        const { data: debtRow, error: debtErr } = await admin
          .from('debts')
          .insert({
            customer_id,
            company_id,
            amount: amtNum,
            currency: pgCurrency,
            due_date: dueISO,
            description: `type=${receivable_type}`,
            seller_id,
            remaining_amount: amtNum,
            status: 'active',
          })
          .select('id,customer_id,amount,currency,due_date,seller_id,status,description,created_at')
          .single()
        if (debtErr || !debtRow) {
          results.push({ error: debtErr?.message || 'Receivable insert failed', customer_name })
          continue
        }
        results.push({
          ...debtRow,
          customer_name,
          seller_name,
          _action: 'inserted'
        })
      }
    } catch (e: any) {
      results.push({ error: e?.message || 'Server error' })
    }
  }

  return res.status(200).json({ items: results })
}
