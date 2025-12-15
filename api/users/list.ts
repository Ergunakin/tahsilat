import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const company_id = req.method === 'GET' ? (req.query?.company_id as string) : (req.body?.company_id as string)
  if (!company_id) return res.status(400).json({ error: 'Missing company_id' })
  try {
    const { data, error } = await admin
      .from('users')
      .select('id,full_name,email,role,manager_id')
      .eq('company_id', company_id)
      .order('full_name', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ items: data || [] })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

