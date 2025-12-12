export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { getSupabaseAdmin } = await import('../utils/supabaseAdmin.js')
    const admin = getSupabaseAdmin()
    if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
    const { seller_id, manager_id } = req.body || {}
    if (!seller_id || !manager_id) return res.status(400).json({ error: 'Missing seller_id or manager_id' })
    const { error } = await admin.from('users').update({ manager_id }).eq('id', seller_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

