import { getSupabaseAdmin } from '../utils/supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const { action } = req.body || {}
  if (!action) return res.status(400).json({ error: 'Missing action' })
  try {
    if (action === 'delete') {
      const { id, company_id } = req.body || {}
      if (!id || !company_id) return res.status(400).json({ error: 'Missing id/company_id' })
      for (let i = 0; i < 3; i++) {
        const { data: children, error: selErr } = await admin
          .from('users')
          .select('id')
          .eq('manager_id', id)
        if (selErr) return res.status(500).json({ error: selErr.message })
        const childIds = (children || []).map((r: any) => r.id)
        if (!childIds.length) break
        const { error: unassignErr } = await admin
          .from('users')
          .update({ manager_id: null })
          .in('id', childIds)
        if (unassignErr) return res.status(500).json({ error: unassignErr.message })
      }
      await admin
        .from('users')
        .update({ manager_id: null })
        .eq('id', id)
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(id)
      if (delAuthErr && !String(delAuthErr.message || '').toLowerCase().includes('not found')) {
        return res.status(500).json({ error: delAuthErr.message })
      }
      const { error: delRowErr } = await admin
        .from('users')
        .delete()
        .eq('id', id)
      if (delRowErr) return res.status(500).json({ error: delRowErr.message })
      return res.status(200).json({ id })
    }
    if (action === 'update') {
      const { id, company_id, email, full_name, role } = req.body || {}
      if (!id || !company_id) return res.status(400).json({ error: 'Missing id/company_id' })
      const { data: existingRow, error: rowFetchErr } = await admin
        .from('users')
        .select('id,email,full_name,role')
        .eq('id', id)
        .eq('company_id', company_id)
        .maybeSingle()
      if (rowFetchErr) return res.status(500).json({ error: rowFetchErr.message })
      if (!existingRow) return res.status(404).json({ error: 'User not found' })
      if (email || full_name || role) {
        const attrs: any = {}
        if (email) attrs.email = email
        const meta: any = {}
        if (full_name) meta.full_name = full_name
        if (role) meta.role = role
        if (Object.keys(meta).length) attrs.user_metadata = meta
        if (Object.keys(attrs).length) {
          const { error: updErr } = await admin.auth.admin.updateUserById(id, attrs)
          if (updErr && !String(updErr.message || '').toLowerCase().includes('not found')) {
            return res.status(500).json({ error: updErr.message })
          }
        }
      }
      const updateRow: any = {}
      if (email) updateRow.email = email
      if (full_name) updateRow.full_name = full_name
      if (role) updateRow.role = role
      if (Object.keys(updateRow).length) {
        const { error: rowErr } = await admin
          .from('users')
          .update(updateRow)
          .eq('id', id)
          .eq('company_id', company_id)
        if (rowErr) return res.status(500).json({ error: rowErr.message })
      }
      return res.status(200).json({ id, email, full_name, role })
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

