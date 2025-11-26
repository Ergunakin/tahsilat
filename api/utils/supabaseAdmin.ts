import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL as string) || (process.env.VITE_SUPABASE_URL as string)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}
