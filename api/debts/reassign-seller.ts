import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { company_id, from_user_id, target_user_id } = req.body || {}
  if (!company_id || !from_user_id || !target_user_id) return res.status(400).json({ error: 'Missing company_id/from_user_id/target_user_id' })
  if (from_user_id === target_user_id) return res.status(400).json({ error: 'Target cannot be same as source' })
  try {
    const { error: debtsErr } = await admin
      .from('debts')
      .update({ seller_id: target_user_id })
      .eq('company_id', company_id)
      .eq('seller_id', from_user_id)
    if (debtsErr) return res.status(500).json({ error: debtsErr.message })

    const { error: custErr } = await admin
      .from('customers')
      .update({ assigned_seller_id: target_user_id })
      .eq('company_id', company_id)
      .eq('assigned_seller_id', from_user_id)
    if (custErr) return res.status(500).json({ error: custErr.message })

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

