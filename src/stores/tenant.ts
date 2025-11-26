import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface Company {
  id: string
  name: string
  slug: string
  email: string
}

interface TenantState {
  slug: string | null
  company: Company | null
  loading: boolean
  setSlug: (slug: string | null) => void
  fetchCompany: (slug: string) => Promise<Company | null>
}

export const useTenant = create<TenantState>((set) => ({
  slug: null,
  company: null,
  loading: false,
  setSlug: (slug) => set({ slug }),
  fetchCompany: async (slug) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('companies')
      .select('id,name,slug,email')
      .eq('slug', slug)
      .maybeSingle()
    if (error) {
      set({ loading: false })
      return null
    }
    set({ company: data ?? null, loading: false, slug })
    return data ?? null
  }
}))

