import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

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
    if (action === 'collect') {
      const { company_id, debt_id, amount, payment_date, notes, recorded_by } = req.body || {}
      if (!company_id || !debt_id || !amount) return res.status(400).json({ error: 'Missing company_id/debt_id/amount' })
      const amt = Number(amount)
      if (!isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' })
      const { data: debt } = await admin
        .from('debts')
        .select('id,customer_id,company_id,currency,remaining_amount,status')
        .eq('company_id', company_id)
        .eq('id', debt_id)
        .maybeSingle()
      if (!debt) return res.status(404).json({ error: 'Debt not found' })
      const rem = Number(debt.remaining_amount) || 0
      if (amt > rem) return res.status(400).json({ error: 'Amount exceeds remaining' })
      const newRem = rem - amt
      const newStatus = newRem <= 0 ? 'paid' : 'partial'
      const { error: updErr } = await admin
        .from('debts')
        .update({ remaining_amount: newRem, status: newStatus })
        .eq('id', debt_id)
        .eq('company_id', company_id)
      if (updErr) return res.status(500).json({ error: updErr.message })
      const payDate = payment_date || new Date().toISOString().slice(0, 10)
      const { error: insErr } = await admin
        .from('payments')
        .insert({
          debt_id: debt_id,
          customer_id: debt.customer_id,
          company_id: company_id,
          amount: amt,
          currency: debt.currency,
          payment_date: payDate,
          notes: notes || null,
          recorded_by: recorded_by || null,
        })
      if (insErr) return res.status(500).json({ error: insErr.message })
      return res.status(200).json({ remaining_amount: newRem, status: newStatus })
    }

    if (action === 'note') {
      const { company_id, debt_id, content, created_by, contact_person, phone, promise_date, promised_amount, currency } = req.body || {}
      if (!company_id || !debt_id || !content) return res.status(400).json({ error: 'Missing company_id/debt_id/content' })
      const { data: debt } = await admin
        .from('debts')
        .select('id,customer_id,company_id')
        .eq('company_id', company_id)
        .eq('id', debt_id)
        .maybeSingle()
      if (!debt) return res.status(404).json({ error: 'Debt not found' })
      if (phone || contact_person) {
        const { error: updCustErr } = await admin
          .from('customers')
          .update({ phone: phone || undefined })
          .eq('id', debt.customer_id)
          .eq('company_id', company_id)
        if (updCustErr) return res.status(500).json({ error: updCustErr.message })
      }
      const noteText = `${contact_person ? 'Kişi: '+contact_person+' | ' : ''}${content}`
      const { error: noteErr } = await admin
        .from('notes')
        .insert({ customer_id: debt.customer_id, company_id: company_id, content: noteText, created_by: created_by || null })
      if (noteErr) return res.status(500).json({ error: noteErr.message })
      if (promise_date && promised_amount) {
        const amt = Number(promised_amount)
        if (isFinite(amt) && amt > 0) {
          const curr = (currency || 'TRY').toUpperCase()
          const { error: promErr } = await admin
            .from('payment_promises')
            .insert({ customer_id: debt.customer_id, company_id: company_id, promised_date: promise_date, promised_amount: amt, currency: curr, notes: content, created_by: created_by || null })
          if (promErr) return res.status(500).json({ error: promErr.message })
        }
      }
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

