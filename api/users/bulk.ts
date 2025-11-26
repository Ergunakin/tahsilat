import { getSupabaseAdmin } from '../utils/supabaseAdmin'

function genPassword() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
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
  const created: any[] = []
  for (const row of items) {
    const full_name = row.full_name || row['Ad Soyad']
    const email = row.email || row['email']
    const roleLabel = (row.role || row['rol'] || '').toString().toLowerCase()
    const roleMap: Record<string, string> = { 'satıcı': 'seller', 'muhasebe': 'accountant', 'yönetici': 'manager', 'admin': 'admin' }
    const role = roleMap[roleLabel] || roleLabel
    if (!full_name || !email || !role) continue
    const password = genPassword()
    const { data: adminCreate, error: adminErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, company_id }
    })
    if (adminErr || !adminCreate.user) {
      created.push({ email, error: adminErr?.message || 'admin create failed' })
      continue
    }
    const uid = adminCreate.user.id
    const { error: insertErr } = await admin
      .from('users')
      .insert({ id: uid, email, full_name, role, company_id })
    if (insertErr) {
      created.push({ email, error: insertErr.message })
      continue
    }
    created.push({ id: uid, email, full_name, role, password })
  }
  return res.status(200).json({ items: created })
}
