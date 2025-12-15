import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

function genPassword() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const company_id = req.method === 'GET' ? (req.query?.company_id as string) : (req.body?.company_id as string)
  const include_temp_passwords = req.method === 'GET'
    ? (String(req.query?.include_temp_passwords || '').toLowerCase() === '1' || String(req.query?.include_temp_passwords || '').toLowerCase() === 'true')
    : Boolean(req.body?.include_temp_passwords)
  if (!company_id) return res.status(400).json({ error: 'Missing company_id' })
  try {
    const { data, error } = await admin
      .from('users')
      .select('id,full_name,email,role,manager_id,created_at')
      .eq('company_id', company_id)
      .order('full_name', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    const items = (data || []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      manager_id: u.manager_id || null,
      created_at: u.created_at || null,
      temp_password: '',
      note: '',
    }))
    if (include_temp_passwords) {
      for (const row of items) {
        const pw = genPassword()
        try {
          const { error: updErr } = await admin.auth.admin.updateUserById(row.id, { password: pw })
          if (!updErr) {
            row.temp_password = pw
          } else {
            row.note = updErr.message || 'auth update failed'
          }
        } catch (e: any) {
          row.note = e?.message || 'auth update error'
        }
      }
    }
    return res.status(200).json({ items })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
