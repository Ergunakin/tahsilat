import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { id, company_id } = req.body || {}
  if (!id || !company_id) return res.status(400).json({ error: 'Missing id/company_id' })
  try {
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(id)
    if (delAuthErr) return res.status(500).json({ error: delAuthErr.message })
    const { error: delRowErr } = await admin
      .from('users')
      .delete()
      .eq('id', id)
      .eq('company_id', company_id)
    if (delRowErr) return res.status(500).json({ error: delRowErr.message })
    return res.status(200).json({ id })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

