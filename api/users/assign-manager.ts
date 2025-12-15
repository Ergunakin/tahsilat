import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { company_id, target_manager_id, ids } = req.body || {}
  if (!company_id || !target_manager_id) {
    return res.status(400).json({ error: 'Missing company_id or target_manager_id' })
  }
  const list: string[] = Array.isArray(ids)
    ? ids.filter(Boolean)
    : (typeof ids === 'string' && ids.length ? [ids] : [])
  if (list.length === 0) {
    // No-op but succeed to unblock UI; nothing to update
    return res.status(200).json({ updated: 0 })
  }
  try {
    const { error } = await admin
      .from('users')
      .update({ manager_id: target_manager_id })
      .eq('company_id', company_id)
      .in('id', list)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ updated: list.length })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
