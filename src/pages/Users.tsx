import { useEffect, useMemo, useState } from 'react'
import { useTenant } from '@/stores/tenant'
import * as XLSX from 'xlsx'

type Role = 'admin' | 'manager' | 'seller' | 'accountant'

function genPassword() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}

export default function Users() {
  const { company } = useTenant()
  const apiBase = ''
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('seller')
  const [password, setPassword] = useState(genPassword())
  const [msg, setMsg] = useState<string | null>(null)
  const [bulkItems, setBulkItems] = useState<any[]>([])

  useEffect(() => { setPassword(genPassword()) }, [fullName, email, role])

  const templateData = useMemo(() => (
    [{ 'Ad Soyad': 'Ad Soyad', 'email': 'ornek@example.com', '6 haneli şifre': 'otomatik', 'rol': 'satıcı|muhasebe|yönetici' }]
  ), [])

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

  const submitSingle = async () => {
    setMsg(null)
    if (!company?.id) { setMsg('Şirket yüklenmedi'); return }
    try {
      const resp = await fetch(`/api/users/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, role, company_id: company.id })
      })
      const ct = resp.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const json = isJson ? await resp.json() : { error: await resp.text() }
      if (!resp.ok) { setMsg(json.error || 'Hata'); return }
      setMsg(`Kullanıcı oluşturuldu: ${json.email} | Geçici şifre: ${json.password}`)
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
      const resp = await fetch(`/api/users/bulk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, items })
      })
      const ct = resp.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const json = isJson ? await resp.json() : { error: await resp.text() }
      if (!resp.ok) { setMsg(json.error || 'Hata'); return }
      setMsg(`Toplu işlem tamamlandı (${json.items.length})`)
    } catch (e: any) {
      setMsg(`İstek başarısız: ${e?.message || 'network error'}`)
      return
    }
    setBulkItems([])
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Kullanıcı Ekle (Manuel)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Ad Soyad" className="border rounded px-3 py-2" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border rounded px-3 py-2" />
          <select value={role} onChange={e=>setRole(e.target.value as Role)} className="border rounded px-3 py-2">
            <option value="seller">Satıcı</option>
            <option value="accountant">Muhasebe</option>
            <option value="manager">Yönetici</option>
            <option value="admin">Admin</option>
          </select>
          <input value={password} readOnly className="border rounded px-3 py-2" />
        </div>
        <button onClick={submitSingle} className="rounded px-4 py-2 bg-neutral-900 text-white">Kaydet</button>
        {msg && <div className="text-sm text-blue-600">{msg}</div>}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Toplu Yükleme (Excel)</h2>
        <div className="flex items-center gap-3">
          <button onClick={downloadTemplate} className="rounded px-3 py-2 border">Şablon indir</button>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
          <button onClick={submitBulk} className="rounded px-4 py-2 bg-neutral-900 text-white">Yükle</button>
        </div>
        <div className="text-sm text-neutral-600">Kolonlar: Ad Soyad, email, 6 haneli rastgele şifre (otomatik), rol (satıcı/muhasebe/yönetici)</div>
        {bulkItems.length > 0 && (
          <div className="rounded border p-3">
            <div className="font-medium mb-2">Önizleme ({bulkItems.length})</div>
            <ul className="text-sm space-y-1">
              {bulkItems.map((i, idx) => (
                <li key={idx}>{i.full_name} - {i.email} - {i.role}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
