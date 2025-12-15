import { useEffect, useMemo, useState } from 'react'
import { useTenant } from '@/stores/tenant'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/i18n'

type Role = 'admin' | 'manager' | 'seller' | 'accountant'

function genPassword() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}

interface UserRow {
  id: string
  full_name: string
  email: string
  role: Role
  manager_id?: string | null
}

export default function Users() {
  const { company } = useTenant()
  const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : undefined
  const [bulkResult, setBulkResult] = useState<any[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const managers = useMemo(() => users.filter(u => u.role === 'manager' || u.role === 'admin').sort((a,b)=>a.full_name.localeCompare(b.full_name)), [users])
  const sellers = useMemo(() => users.filter(u => u.role === 'seller').sort((a,b)=>a.full_name.localeCompare(b.full_name)), [users])
  const assignables = useMemo(() => users.filter(u => u.role === 'seller' || u.role === 'manager').sort((a,b)=>a.full_name.localeCompare(b.full_name)), [users])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [targetManager, setTargetManager] = useState<string>('')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const [assignBusy, setAssignBusy] = useState(false)
  const managerNameMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.full_name])), [users])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<Role>('seller')

  useEffect(() => {
    const loadUsers = async () => {
      if (!company?.id) return
      try {
        let urlGet = '/api/users/list?company_id=' + encodeURIComponent(company.id)
        let urlPost = '/api/users/list'
        if (import.meta.env.DEV) {
          if (apiBase && apiBase.length > 0) {
            urlGet = `${apiBase}/api/users/list?company_id=${encodeURIComponent(company.id)}`
            urlPost = `${apiBase}/api/users/list`
          }
        }
        const respGet = await fetch(urlGet, { method: 'GET' })
        if (respGet.ok) {
          const ct = respGet.headers.get('content-type') || ''
          const isJson = ct.includes('application/json')
          const json = isJson ? await respGet.json() : { error: await respGet.text() }
          if (Array.isArray(json.items)) { setUsers(json.items || []); return }
        }
        const respPost = await fetch(urlPost, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: company.id }) })
        if (respPost.ok) {
          const ct = respPost.headers.get('content-type') || ''
          const isJson = ct.includes('application/json')
          const json = isJson ? await respPost.json() : { error: await respPost.text() }
          if (Array.isArray(json.items)) { setUsers(json.items || []); return }
        }
      } catch (e) {
        console.warn('users/list failed', e)
      }
      try {
        const { data } = await supabase
          .from('users')
          .select('id,full_name,email,role,manager_id')
          .eq('company_id', company.id)
          .order('full_name', { ascending: true })
        const rows = (data as any) ?? []
        setUsers(rows)
      } catch {}
    }
    loadUsers()
  }, [company?.id])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('seller')
  const [password, setPassword] = useState(genPassword())
  const [msg, setMsg] = useState<string | null>(null)
  const [bulkItems, setBulkItems] = useState<any[]>([])
  const [exportBusy, setExportBusy] = useState(false)
  const [exportIncludeTemps, setExportIncludeTemps] = useState(false)

  const { t, lang } = useI18n()
  useEffect(() => { setPassword(genPassword()) }, [fullName, email, role])

  const templateData = useMemo(() => (
    [{ [t('full_name')]: t('full_name'), [t('email')]: 'ornek@example.com', '6 haneli şifre': 'otomatik', 'rol': 'satıcı|muhasebe|yönetici' }]
  ), [lang])

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'KullaniciSablon')
    XLSX.writeFile(wb, 'kullanici_sablon.xlsx')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws)
    const mapped = rows.map((r: any) => ({
      full_name: r['Ad Soyad'] || r['ad soyad'] || r['fullname'] || r['Full Name'],
      email: r['email'] || r['Email'],
      role: (r['rol'] || r['role'] || '').toString().toLowerCase(),
      password: genPassword(),
    }))
    setBulkItems(mapped)
  }

  const downloadResults = () => {
    if (!bulkResult.length) return
    const ws = XLSX.utils.json_to_sheet(bulkResult)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sonuclar')
    XLSX.writeFile(wb, 'kullanici_yukleme_sonuclari.xlsx')
  }

  const submitSingle = async () => {
    setMsg(null)
    if (!company?.id) { setMsg('Şirket yüklenmedi'); return }
    try {
      let url = `/api/users/create`
      if (import.meta.env.DEV) {
        if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/create`
      }
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, role, company_id: company.id })
      })
      const ct = resp.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const json = isJson ? await resp.json() : { error: await resp.text() }
      if (!resp.ok) { setMsg(json.error || 'Hata'); return }
      setMsg(`Kullanıcı oluşturuldu: ${json.email} | Geçici şifre: ${json.password}`)
      const newUser: UserRow = {
        id: json.id,
        full_name: json.full_name || fullName,
        email: json.email || email,
        role,
        manager_id: null,
      }
      setUsers(prev => [...prev, newUser].sort((a,b)=>a.full_name.localeCompare(b.full_name)))
    } catch (e: any) {
      setMsg(`İstek başarısız: ${e?.message || 'network error'}`)
      return
    }
    setFullName(''); setEmail(''); setRole('seller'); setPassword(genPassword())
  }

  const submitBulk = async () => {
    setMsg(null)
    if (!company?.id) { setMsg('Şirket yüklenmedi'); return }
    const items = bulkItems.map(i => ({ full_name: i.full_name, email: i.email, role: i.role }))
    try {
      let url = `/api/users/bulk`
      if (import.meta.env.DEV) {
        if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/bulk`
      }
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, items })
      })
      const ct = resp.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const json = isJson ? await resp.json() : { error: await resp.text() }
      if (!resp.ok) { setMsg(json.error || 'Hata'); return }
      setBulkResult(json.items || [])
      setMsg(`Toplu işlem tamamlandı (${json.items.length})`)
      const created = (json.items || []).filter((i: any) => i.id && !i.error).map((i: any) => ({
        id: i.id,
        full_name: i.full_name,
        email: i.email,
        role: i.role,
        manager_id: null,
      })) as UserRow[]
      if (created.length) {
        setUsers(prev => [...prev, ...created].sort((a,b)=>a.full_name.localeCompare(b.full_name)))
      }
    } catch (e: any) {
      setMsg(`İstek başarısız: ${e?.message || 'network error'}`)
      return
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('users_list_title')}</h2>
        <div className="flex items-center gap-3">
          <button
            className="rounded px-3 py-2 border"
            onClick={async ()=>{
              if (!company?.id) return
              let url = '/api/users/repair-hierarchy'
              if (import.meta.env.DEV) {
                if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/repair-hierarchy`
              }
              const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: company.id }) })
              const ct = resp.headers.get('content-type') || ''
              const isJson = ct.includes('application/json')
              const json = isJson ? await resp.json() : { error: await resp.text() }
              if (!resp.ok) { alert(json.error || 'Onarım hata'); return }
              await (async () => {
                try {
                  let urlGet = '/api/users/list?company_id=' + encodeURIComponent(company!.id)
                  if (import.meta.env.DEV && apiBase && apiBase.length > 0) urlGet = `${apiBase}/api/users/list?company_id=${encodeURIComponent(company!.id)}`
                  const r = await fetch(urlGet)
                  if (r.ok) {
                    const j = await r.json()
                    setUsers(j.items || [])
                    return
                  }
                } catch {}
                const { data } = await supabase
                  .from('users')
                  .select('id,full_name,email,role,manager_id')
                  .eq('company_id', company!.id)
                  .order('full_name', { ascending: true })
                setUsers((data as any) ?? [])
              })()
              alert(`Onarılan kayıt: ${json.repaired ?? 0}`)
            }}
          >Hiyerarşiyi Onar</button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={exportIncludeTemps} onChange={e=>setExportIncludeTemps(e.target.checked)} />
            Geçici şifre üret
          </label>
          <button
            disabled={exportBusy || !company?.id}
            className="rounded px-3 py-2 border"
            onClick={async ()=>{
              if (!company?.id) return
              setExportBusy(true)
              try {
                let urlGet = `/api/users/export?company_id=${encodeURIComponent(company.id)}&include_temp_passwords=${exportIncludeTemps ? '1' : '0'}`
                let urlPost = `/api/users/export`
                if (import.meta.env.DEV && apiBase && apiBase.length > 0) {
                  urlGet = `${apiBase}/api/users/export?company_id=${encodeURIComponent(company.id)}&include_temp_passwords=${exportIncludeTemps ? '1' : '0'}`
                  urlPost = `${apiBase}/api/users/export`
                }
                let items: any[] = []
                let ok = false
                try {
                  const respGet = await fetch(urlGet, { headers: { 'Accept': 'application/json' } })
                  const ctGet = respGet.headers.get('content-type') || ''
                  if (respGet.ok && ctGet.includes('application/json')) {
                    const j = await respGet.json()
                    items = j.items || []
                    ok = true
                  }
                } catch {}
                if (!ok) {
                  try {
                    const respPost = await fetch(urlPost, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ company_id: company.id, include_temp_passwords: exportIncludeTemps }) })
                    const ctPost = respPost.headers.get('content-type') || ''
                    if (respPost.ok && ctPost.includes('application/json')) {
                      const j = await respPost.json()
                      items = j.items || []
                      ok = true
                    }
                  } catch {}
                }
                if (!ok) {
                  const { data, error } = await supabase
                    .from('users')
                    .select('id,full_name,email,role,manager_id,created_at')
                    .eq('company_id', company.id)
                    .order('full_name', { ascending: true })
                  const rows = (data as any) ?? []
                  items = rows.map((u: any) => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, manager_id: u.manager_id || null, created_at: u.created_at || null, temp_password: '', note: exportIncludeTemps ? 'geçici şifre üretilmedi' : '' }))
                }
                const ws = XLSX.utils.json_to_sheet(items)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Kullanicilar')
                XLSX.writeFile(wb, 'kullanicilar.xlsx')
              } catch (e: any) {
                alert(e?.message || 'İndirme hatası')
              }
              setExportBusy(false)
            }}
          >Kullanıcıları İndir</button>
        </div>
        <HierarchyView users={users} companyId={company?.id || ''} apiBase={apiBase} onRefresh={async ()=>{
          try {
            let urlGet = '/api/users/list?company_id=' + encodeURIComponent(company!.id)
            let urlPost = '/api/users/list'
            if (import.meta.env.DEV) {
              if (apiBase && apiBase.length > 0) {
                urlGet = `${apiBase}/api/users/list?company_id=${encodeURIComponent(company!.id)}`
                urlPost = `${apiBase}/api/users/list`
              }
            }
            const respGet = await fetch(urlGet, { method: 'GET' })
            if (respGet.ok) {
              const ct = respGet.headers.get('content-type') || ''
              const isJson = ct.includes('application/json')
              const json = isJson ? await respGet.json() : { error: await respGet.text() }
              if (Array.isArray(json.items)) { setUsers(json.items || []); return }
            }
            const respPost = await fetch(urlPost, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: company!.id }) })
            if (respPost.ok) {
              const ct = respPost.headers.get('content-type') || ''
              const isJson = ct.includes('application/json')
              const json = isJson ? await respPost.json() : { error: await respPost.text() }
              if (Array.isArray(json.items)) { setUsers(json.items || []); return }
            }
          } catch {}
          try {
            const { data } = await supabase
              .from('users')
              .select('id,full_name,email,role,manager_id')
              .eq('company_id', company!.id)
              .order('full_name', { ascending: true })
            setUsers((data as any) ?? [])
          } catch {}
        }} />
        {assignError && <div className="text-sm text-red-600 mt-2">{assignError}</div>}
      </section>
      {assignOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-md w-[720px] max-w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{t('assign_modal_title')}</div>
              <button onClick={()=>{ setAssignOpen(false) }} className="rounded px-2 py-1 border">{t('close')}</button>
            </div>
            <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm">{t('manager')}</label>
              <select value={targetManager} onChange={e=>setTargetManager(e.target.value)} className="border rounded px-2 py-1">
                <option value="">{t('select')}</option>
                {managers.map(m => (<option key={m.id} value={m.id}>{m.full_name}</option>))}
              </select>
              <button onClick={()=>setSelectedAssigneeIds(assignables.map(a=>a.id))} className="rounded px-2 py-1 border">{t('select_all')}</button>
              <button onClick={()=>setSelectedAssigneeIds([])} className="rounded px-2 py-1 border">{t('clear')}</button>
            </div>
              <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-x-auto max-h-80 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                    <tr>
                      <th className="text-left p-2">{t('select')}</th>
                      <th className="text-left p-2">{t('full_name')}</th>
                      <th className="text-left p-2">{t('email')}</th>
                      <th className="text-left p-2">{t('role')}</th>
                      <th className="text-left p-2">{t('current_manager')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignables.map(a => {
                      const checked = selectedAssigneeIds.includes(a.id)
                      return (
                        <tr key={a.id} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="p-2">
                            <input type="checkbox" checked={checked} onChange={(e)=>{
                              const on = e.target.checked
                              setSelectedAssigneeIds(prev => on ? [...prev, a.id] : prev.filter(id => id !== a.id))
                            }} />
                          </td>
                          <td className="p-2">{a.full_name}</td>
                          <td className="p-2">{a.email}</td>
                          <td className="p-2">{a.role}</td>
                          <td className="p-2">{a.manager_id ? managerNameMap[a.manager_id] || '—' : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={()=>setAssignOpen(false)} className="rounded px-3 py-2 border">{t('cancel')}</button>
                <button disabled={!company?.id || !targetManager || selectedAssigneeIds.length===0 || assignBusy} onClick={async ()=>{
                  setAssignError(null)
                  setAssignBusy(true)
                  try {
                    let url = '/api/users/assign-manager'
                    if (import.meta.env.DEV) {
                      if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/assign-manager`
                    }
                    const resp = await fetch(url, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ company_id: company!.id, target_manager_id: targetManager, ids: Array.from(new Set(selectedAssigneeIds)) })
                    })
                    const ct = resp.headers.get('content-type') || ''
                    const isJson = ct.includes('application/json')
                    const json = isJson ? await resp.json() : { error: await resp.text() }
                    if (!resp.ok) { setAssignError(json.error || 'Atama hatası'); setAssignBusy(false); return }
                    // Refresh from server to reflect all descendants updates
                    const { data } = await supabase
                      .from('users')
                      .select('id,full_name,email,role,manager_id')
                      .eq('company_id', company!.id)
                      .order('full_name', { ascending: true })
                    setUsers((data as any) ?? [])
                    setAssignBusy(false)
                    setAssignOpen(false)
                  } catch (err: any) {
                    setAssignError(err?.message || 'Ağ hatası')
                    setAssignBusy(false)
                  }
                }} className="rounded px-3 py-2 bg-neutral-900 text-white disabled:opacity-50">{t('save')}</button>
              </div>
              {assignError && <div className="text-sm text-red-600">{assignError}</div>}
            </div>
          </div>
        </div>
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('users_manual_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder={t('full_name')} className="border rounded px-3 py-2" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('email')} className="border rounded px-3 py-2" />
          <select value={role} onChange={e=>setRole(e.target.value as Role)} className="border rounded px-3 py-2">
            <option value="seller">{t('role_seller')}</option>
            <option value="manager">{t('role_manager')}</option>
            <option value="accountant">{t('role_accountant')}</option>
            <option value="admin">{t('role_admin')}</option>
          </select>
          <input value={password} readOnly className="border rounded px-3 py-2" placeholder={t('temp_password')} />
        </div>
        <button onClick={submitSingle} className="rounded px-4 py-2 bg-neutral-900 text-white">{t('save')}</button>
        {msg && <div className="text-sm text-blue-600">{msg}</div>}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('users_bulk_title')}</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <button onClick={downloadTemplate} className="rounded px-3 py-2 border">{t('template_download')}</button>
          <div className="flex flex-col gap-2">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
            <button onClick={submitBulk} disabled={bulkItems.length === 0} className="rounded px-4 py-2 bg-neutral-900 text-white disabled:opacity-50">{t('bulk_create')}</button>
          </div>
        </div>
        <div className="text-sm text-neutral-600">{t('columns_hint')}</div>
        {bulkItems.length > 0 && (
          <div className="rounded border p-3">
            <div className="font-medium mb-2">{t('preview')} ({bulkItems.length})</div>
            <ul className="text-sm space-y-1">
              {bulkItems.map((i, idx) => (
                <li key={idx}>{i.full_name} - {i.email} - {i.role}</li>
              ))}
            </ul>
          </div>
        )}
        {bulkResult.length > 0 && (
          <div className="rounded border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{t('results')} ({bulkResult.length})</div>
              <button onClick={downloadResults} className="rounded px-3 py-1 border">{t('download_results')}</button>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="text-left p-2">{t('full_name')}</th>
                  <th className="text-left p-2">{t('email')}</th>
                  <th className="text-left p-2">{t('role')}</th>
                  <th className="text-left p-2">{t('temp_password')}</th>
                  <th className="text-left p-2">{t('assign_error')}</th>
                </tr>
              </thead>
              <tbody>
                {bulkResult.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="p-2">{r.full_name || '—'}</td>
                    <td className="p-2">{r.email || '—'}</td>
                    <td className="p-2">{r.role || '—'}</td>
                    <td className="p-2">{r.password || '—'}</td>
                    <td className="p-2 text-red-600">{r.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function HierarchyView({ users, companyId, apiBase, onRefresh }: { users: UserRow[]; companyId: string; apiBase?: string; onRefresh: ()=>void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const byManager: Record<string, UserRow[]> = useMemo(() => {
    const m: Record<string, UserRow[]> = {}
    users.forEach(u => {
      if (u.manager_id) {
        const arr = m[u.manager_id] || (m[u.manager_id] = [])
        if (u.role === 'seller' || u.role === 'manager') arr.push(u)
      }
    })
    Object.values(m).forEach(arr => arr.sort((a,b)=>a.full_name.localeCompare(b.full_name)))
    return m
  }, [users])
  const roots = useMemo(() => {
    const mgrs = users.filter(u => u.role === 'manager')
    const top = mgrs.filter(u => {
      const parent = users.find(p => p.id === u.manager_id)
      return !parent || parent.role !== 'manager'
    })
    const list = top.length ? top : mgrs
    return list.sort((a,b)=>a.full_name.localeCompare(b.full_name))
  }, [users])
  const childrenOf = (id: string) => byManager[id] || []
  const unassignedSellers = useMemo(() => {
    return users
      .filter(u => u.role === 'seller' && (!u.manager_id || !users.find(p => p.id === u.manager_id && p.role === 'manager')))
      .sort((a,b)=>a.full_name.localeCompare(b.full_name))
  }, [users])
  const isDescendant = useMemo(() => {
    const memo: Record<string, Set<string>> = {}
    const build = (start: string) => {
      if (memo[start]) return memo[start]
      const set = new Set<string>()
      const stack = [...(byManager[start] || [])]
      while (stack.length) {
        const n = stack.pop()!
        if (set.has(n.id)) continue
        set.add(n.id)
        const kids = byManager[n.id] || []
        kids.forEach(k => stack.push(k))
      }
      memo[start] = set
      return set
    }
    return (a: string, b: string) => build(a).has(b)
  }, [byManager])
  const onDropAssign = async (dragId: string, targetId: string) => {
    if (!companyId) return
    setErr(null)
    setBusy(true)
    try {
      let url = '/api/users/assign-manager'
      if (import.meta.env.DEV) {
        if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/assign-manager`
      }
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, target_manager_id: targetId, ids: [dragId] })
      })
      const ct = resp.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const json = isJson ? await resp.json() : { error: await resp.text() }
      if (!resp.ok) { setErr(json.error || 'Atama hatası'); setBusy(false); return }
      await onRefresh()
    } catch (e: any) {
      setErr(e?.message || 'Ağ hatası')
    }
    setBusy(false)
  }
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      <div className="space-y-2">
        {roots.length === 0 ? (
          <div>
            <div className="text-sm font-medium mb-1">Atanmamış Satıcılar</div>
            {unassignedSellers.length === 0 ? (
              <div className="text-sm">—</div>
            ) : (
              <div className="space-y-1">
                {unassignedSellers.map(s => (
                  <div key={s.id}
                    className="flex items-center gap-2 rounded px-2 py-1 border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    draggable
                    onDragStart={(e)=>{
                      e.dataTransfer.setData('text/plain', JSON.stringify({ id: s.id, role: s.role }))
                    }}
                  >
                    <span className="text-sm">{s.full_name}</span>
                    <span className="text-xs text-neutral-600">{s.role}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-neutral-500 mt-2">Satıcıyı bir yönetici üzerine sürükleyerek atayın</div>
          </div>
        ) : roots.map(r => (
          <TreeNode key={r.id} node={r} childrenFn={childrenOf} isDescendant={isDescendant} onAssign={onDropAssign} onRefresh={onRefresh} visited={new Set([r.id])} depth={0} />
        ))}
      </div>
      {roots.length > 0 && unassignedSellers.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-1">Atanmamış Satıcılar</div>
          <div className="space-y-1">
            {unassignedSellers.map(s => (
              <div key={s.id}
                className="flex items-center gap-2 rounded px-2 py-1 border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                draggable
                onDragStart={(e)=>{
                  e.dataTransfer.setData('text/plain', JSON.stringify({ id: s.id, role: s.role }))
                }}
              >
                <span className="text-sm">{s.full_name}</span>
                <span className="text-xs text-neutral-600">{s.role}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-neutral-500 mt-2">Satıcıyı bir yönetici üzerine sürükleyerek atayın</div>
        </div>
      )}
      {busy && <div className="text-xs text-neutral-500 mt-2">İşleniyor…</div>}
    </div>
  )
}

function TreeNode({ node, childrenFn, isDescendant, onAssign, onRefresh, visited, depth = 0 }: { node: UserRow; childrenFn: (id: string)=>UserRow[]; isDescendant: (a:string,b:string)=>boolean; onAssign: (dragId:string,targetId:string)=>void; onRefresh: ()=>void; visited: Set<string>; depth?: number }) {
  if (depth > 50) return null
  const kids = (childrenFn(node.id) || []).filter(k => !visited.has(k.id))
  const { company } = useTenant()
  const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : undefined
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(node.full_name)
  const [email, setEmail] = useState(node.email)
  const [err, setErr] = useState<string | null>(null)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: node.id, role: node.role }))
  }
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    try {
      const raw = e.dataTransfer.getData('text/plain')
      const obj = JSON.parse(raw || '{}')
      const dragId = obj.id as string
      const dragRole = obj.role as Role
      if (!dragId) return
      if (dragId === node.id) return
      if (node.role !== 'manager') return
      if (isDescendant(dragId, node.id)) return
      if (dragRole !== 'seller' && dragRole !== 'manager') return
      onAssign(dragId, node.id)
    } catch {}
  }
  return (
    <div className="pl-2">
      <div
        className="flex items-center gap-2 rounded px-2 py-1 border hover:bg-neutral-50 dark:hover:bg-neutral-800"
        draggable={!editing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {editing ? (
          <>
            <input value={name} onChange={e=>setName(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <input value={email} onChange={e=>setEmail(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <button
              className="text-xs px-2 py-1 rounded border"
              disabled={saving || !company?.id}
              onClick={async ()=>{
                if (!company?.id) return
                setErr(null); setSaving(true)
                try {
                  let url = '/api/users/update'
                  if (import.meta.env.DEV && apiBase && apiBase.length > 0) url = `${apiBase}/api/users/update`
                  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: node.id, company_id: company.id, full_name: name, email }) })
                  const ct = resp.headers.get('content-type') || ''
                  const isJson = ct.includes('application/json')
                  const json = isJson ? await resp.json() : { error: await resp.text() }
                  if (!resp.ok) { setErr(json.error || 'Hata'); setSaving(false); return }
                  setEditing(false)
                } catch (e: any) {
                  setErr(e?.message || 'Ağ hatası')
                }
                setSaving(false)
              }}
            >Kaydet</button>
            <button className="text-xs px-2 py-1 rounded border" onClick={()=>{ setEditing(false); setName(node.full_name); setEmail(node.email) }}>İptal</button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">{node.full_name}</span>
            <span className="text-xs text-neutral-600">{node.email}</span>
            <span className="text-xs text-neutral-600">{node.role}</span>
            <button className="ml-auto text-xs px-2 py-1 rounded border" title="Düzenle" onClick={(e)=>{ e.stopPropagation(); setEditing(true) }}>✎</button>
            <button className="text-xs px-2 py-1 rounded border" title="Sil"
              onMouseDown={(e)=>{ e.stopPropagation(); }}
              onClick={async (e)=>{
              e.stopPropagation()
              e.preventDefault()
              if (!company?.id) return
              if (!confirm('Silmek istediğinizden emin misiniz?')) return
              try {
                // Prefer local API (updated logic), then fallback to remote base if configured
                let ok = false
                try {
                  const respLocal = await fetch('/api/users/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: node.id, company_id: company.id }) })
                  const ctLocal = respLocal.headers.get('content-type') || ''
                  if (respLocal.ok && ctLocal.includes('application/json')) { ok = true }
                } catch {}
                if (!ok && import.meta.env.DEV && apiBase && apiBase.length > 0) {
                  const respRemote = await fetch(`${apiBase}/api/users/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: node.id, company_id: company.id }) })
                  const ctRemote = respRemote.headers.get('content-type') || ''
                  if (!(respRemote.ok && ctRemote.includes('application/json'))) {
                    const msg = ctRemote.includes('application/json') ? (await respRemote.json()).error : await respRemote.text()
                    alert(msg || 'Silme başarısız')
                    return
                  }
                }
                await onRefresh()
              } catch (e: any) {
                alert(e?.message || 'Ağ hatası')
              }
            }}>🗑</button>
          </>
        )}
      </div>
      {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
      {kids.length > 0 && (
        <div className="pl-4 mt-1 space-y-1">
          {kids.map(k => (
            <TreeNode key={k.id} node={k} childrenFn={childrenFn} isDescendant={isDescendant} onAssign={onAssign} onRefresh={onRefresh} visited={new Set([...visited, k.id])} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
