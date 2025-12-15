import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { company_id } = req.body || {}
  if (!company_id) return res.status(400).json({ error: 'Missing company_id' })
  try {
    const { data: affectedRows, error } = await admin
      .from('users')
      .update({ manager_id: null })
      .eq('company_id', company_id)
      .filter('manager_id', 'eq', admin.rpc ? 'self' : undefined) // placeholder to keep types
    // Fallback when filter with eq self is not available; perform explicit check via select-then-update
    if (error || !affectedRows) {
      const { data: bad } = await admin
        .from('users')
        .select('id')
        .eq('company_id', company_id)
        .not('manager_id', 'is', null)
      const badIds = (bad || []).filter((u: any) => u.id && u.id === (u as any).manager_id).map((u: any) => u.id)
      if (badIds.length) {
        const { error: updErr } = await admin
          .from('users')
          .update({ manager_id: null })
          .eq('company_id', company_id)
          .in('id', badIds)
        if (updErr) return res.status(500).json({ error: updErr.message })
        return res.status(200).json({ repaired: badIds.length })
      }
      return res.status(200).json({ repaired: 0 })
    }
    const count = Array.isArray(affectedRows) ? (affectedRows as any[]).length : 0
    return res.status(200).json({ repaired: count })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
