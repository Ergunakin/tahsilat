import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { company_id, id } = req.body || {}
  if (!company_id || !id) return res.status(400).json({ error: 'Missing company_id or id' })
  try {
    const { error } = await admin
      .from('debts')
      .delete()
      .eq('company_id', company_id)
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ id })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

