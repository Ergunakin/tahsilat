import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../utils/supabaseAdmin'

function genPassword() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { full_name, email, role, company_id } = req.body || {}
  if (!full_name || !email || !role || !company_id) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const password = genPassword()
  const { data: created, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, company_id }
  })
  if (adminErr || !created.user) return res.status(500).json({ error: adminErr?.message || 'Admin create failed' })
  const uid = created.user.id
  const { error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({ id: uid, email, full_name, role, company_id })
  if (insertErr) return res.status(500).json({ error: insertErr.message })
  return res.status(200).json({ id: uid, email, full_name, role, company_id, password })
}
