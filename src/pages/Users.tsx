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
      const { data } = await supabase
        .from('users')
        .select('id,full_name,email,role,manager_id')
        .eq('company_id', company.id)
        .order('full_name', { ascending: true })
      setUsers((data as any) ?? [])
    }
    loadUsers()
  }, [company?.id])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('seller')
  const [password, setPassword] = useState(genPassword())
  const [msg, setMsg] = useState<string | null>(null)
  const [bulkItems, setBulkItems] = useState<any[]>([])

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
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">{t('full_name')}</th>
                <th className="text-left p-2">{t('email')}</th>
                <th className="text-left p-2">{t('role')}</th>
                <th className="text-left p-2">{t('manager')}</th>
                <th className="text-left p-2">{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td className="p-2" colSpan={6}>{t('empty_list')}</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <button
                        title={editingId === u.id ? 'OK' : 'Edit'}
                        className="rounded px-2 py-1 border"
                        onClick={async () => {
                          if (editingId === u.id) {
                            const body = { id: u.id, company_id: company?.id, full_name: editFullName, email: editEmail, role: editRole }
                            setSavingId(u.id)
                            try {
                              let url = '/api/users/update'
                              if (import.meta.env.DEV) {
                                if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/update`
                              }
                              const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                              const ct = resp.headers.get('content-type') || ''
                              const isJson = ct.includes('application/json')
                              const json = isJson ? await resp.json() : { error: await resp.text() }
                              if (!resp.ok) { alert(json.error || 'Hata'); setSavingId(null); return }
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, full_name: editFullName, email: editEmail, role: editRole } as UserRow : x))
                              setEditingId(null)
                              setSavingId(null)
                            } catch (e: any) {
                              alert(e?.message || 'Ağ hatası')
                              setSavingId(null)
                            }
                          } else {
                            setEditingId(u.id)
                            setEditFullName(u.full_name)
                            setEditEmail(u.email)
                            setEditRole(u.role)
                          }
                        }}
                      >{editingId === u.id ? '✓' : '✎'}</button>
                      <button
                        title="Delete"
                        className="rounded px-2 py-1 border"
                        onClick={async () => {
                          if (!company?.id) return
                          if (!confirm('Silmek istediğinize emin misiniz?')) return
                          try {
                            let url = '/api/users/delete'
                            if (import.meta.env.DEV) {
                              if (apiBase && apiBase.length > 0) url = `${apiBase}/api/users/delete`
                            }
                            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, company_id: company.id }) })
                            const ct = resp.headers.get('content-type') || ''
                            const isJson = ct.includes('application/json')
                            const json = isJson ? await resp.json() : { error: await resp.text() }
                            if (!resp.ok) { alert(json.error || 'Hata'); return }
                            setUsers(prev => prev.filter(x => x.id !== u.id))
                          } catch (e: any) {
                            alert(e?.message || 'Ağ hatası')
                          }
                        }}
                      >×</button>
                    </div>
                  </td>
                  <td className="p-2">
                    {editingId === u.id ? (
                      <input value={editFullName} onChange={e=>setEditFullName(e.target.value)} className="border rounded px-2 py-1 w-full" />
                    ) : u.full_name}
                  </td>
                  <td className="p-2">
                    {editingId === u.id ? (
                      <input value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="border rounded px-2 py-1 w-full" />
                    ) : u.email}
                  </td>
                  <td className="p-2">
                    {editingId === u.id ? (
                      <select value={editRole} onChange={e=>setEditRole(e.target.value as Role)} className="border rounded px-2 py-1">
                        <option value="seller">{t('role_seller')}</option>
                        <option value="manager">{t('role_manager')}</option>
                        <option value="accountant">{t('role_accountant')}</option>
                        <option value="admin">{t('role_admin')}</option>
                      </select>
                    ) : u.role}
                  </td>
                  <td className="p-2">
                    {u.role === 'seller' ? (u.manager_id ? managerNameMap[u.manager_id] || '—' : '—') : '—'}
                  </td>
                  <td className="p-2">
                    {(u.role === 'manager' || u.role === 'admin') && (
                      <button
                        onClick={() => {
                          const teamIds = users
                            .filter(x => x.manager_id === u.id && (x.role === 'seller' || x.role === 'manager'))
                            .map(x => x.id)
                          setSelectedAssigneeIds([u.id, ...teamIds])
                          setTargetManager(u.id)
                          setAssignOpen(true)
                          setAssignError(null)
                        }}
                        className="rounded px-3 py-1 border"
                      >{t('assign_sellers')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                    setUsers(prev => prev.map(u => selectedAssigneeIds.includes(u.id) ? { ...u, manager_id: targetManager } : u))
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
