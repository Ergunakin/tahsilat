import * as React from 'react'

type Lang = 'tr' | 'en'

const dict: Record<Lang, Record<string, string>> = {
  tr: {
    app_title: 'Yeni Proje',
    app_start_hint: 'Başlamak için aşağıdaki seçenekleri kullanın.',
    demo: 'Demo',
    theme_toggle_light: 'Temayı açık yap',
    theme_toggle_dark: 'Temayı koyu yap',
    slug_placeholder: 'Şirket slug',
    goto_dashboard: 'Şirket panosuna git',
    login: 'Giriş',
    register: 'Kayıt',
    logout: 'Çıkış',
    nav_dashboard: 'Pano',
    nav_customers: 'Müşteriler',
    nav_receivables: 'Alacaklar',
    nav_payments: 'Ödemeler',
    nav_settings: 'Ayarlar',
    nav_users: 'Kullanıcılar',
    nav_calendar: 'Takvim',
    company_home: 'Şirket Ana Sayfa',
    dashboard_title: 'Panosu',
    card_customers: 'Müşteriler',
    card_active_debts: 'Aktif Borçlar',
    card_overdue_amount: 'Vadesi Geçen Tutar',
    customers_title: 'Müşteriler',
    customers_name: 'Ad',
    customers_email: 'E-posta',
    customers_phone: 'Telefon',
    customers_total_debt: 'Toplam Borç',
    customers_overdue_debt: 'Geciken Borç',
    customers_created: 'Oluşturulma',
    loading: 'Yükleniyor...',
    empty_list: 'Kayıt yok',
    users_manual_title: 'Kullanıcı Ekle (Manuel)',
    full_name: 'Ad Soyad',
    role: 'Rol',
    temp_password: 'Geçici Şifre',
    save: 'Kaydet',
    users_bulk_title: 'Toplu Yükleme (Excel)',
    template_download: 'Şablon indir',
    bulk_create: 'Kullanıcıları yarat',
    columns_hint: 'Kolonlar: Ad Soyad, email, 6 haneli rastgele şifre (otomatik), rol (satıcı/muhasebe/yönetici)',
    preview: 'Önizleme',
    results: 'Sonuçlar',
    download_results: 'Sonuçları indir',
    users_list_title: 'Mevcut Kullanıcılar',
    manager: 'Yönetici',
    action: 'İşlem',
    assign_sellers: 'Satıcı ata',
    assign_modal_title: 'Satıcıları Yöneticiye Ata',
    select: 'Seç',
    current_manager: 'Mevcut Yönetici',
    select_all: 'Tümünü seç',
    clear: 'Temizle',
    cancel: 'İptal',
    close: 'Kapat',
    network_error: 'Ağ hatası',
    assign_error: 'Atama hatası',
    email: 'Email',
    password: 'Şifre',
    logging_in: 'Gönderiliyor...',
    login_submit: 'Giriş Yap',
    registering: 'Kaydediliyor...',
    register_submit: 'Kayıt Ol',
    company_not_found: 'Şirket bulunamadı',
    checking: 'Kontrol ediliyor...',
    not_authorized: 'Yetkiniz yok',
    role_seller: 'Satış Temsilcisi',
    role_manager: 'Satış Yöneticisi',
    role_accountant: 'Muhasebe',
    role_admin: 'Yönetici',
    customer: 'Müşteri',
    due_date: 'Vade Tarihi',
    amount: 'Alacak Tutarı',
    currency: 'Para Birimi',
    debt_type: 'Alacak Tipi',
    seller: 'Satış Temsilcisi',
    transaction_date: 'İşlem Tarihi (opsiyonel)',
    save_debt: 'Alacak Kaydet',
    debt_saved: 'Alacak kaydedildi',
    select_placeholder: 'Seçin',
    debts_list_title: 'Mevcut Alacaklar',
    debt_status: 'Durum',
    created_at: 'Oluşturulma',
    receivable_type_senet: 'Senet',
    receivable_type_cek: 'Çek',
    receivable_type_havale: 'Havale',
    settings_currencies_label: 'Para Birimleri (virgül ile)',
    settings_receivable_types_label: 'Alacak Tipleri (virgül ile)',
    saved: 'Kaydedildi',
    receivables_bulk_title: 'Toplu Alacak Yükleme (Excel)',
    bulk_receivables_create: 'Alacakları ekle',
  },
  en: {
    app_title: 'New Project',
    app_start_hint: 'Use the options below to get started.',
    demo: 'Demo',
    theme_toggle_light: 'Switch to light theme',
    theme_toggle_dark: 'Switch to dark theme',
    slug_placeholder: 'Company slug',
    goto_dashboard: 'Go to company dashboard',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    nav_dashboard: 'Dashboard',
    nav_customers: 'Customers',
    nav_payments: 'Payments',
    nav_settings: 'Settings',
    nav_users: 'Users',
    nav_calendar: 'Calendar',
    nav_receivables: 'Receivables',
    company_home: 'Company Home',
    dashboard_title: 'Dashboard',
    card_customers: 'Customers',
    card_active_debts: 'Active Debts',
    card_overdue_amount: 'Overdue Amount',
    customers_title: 'Customers',
    customers_name: 'Name',
    customers_email: 'Email',
    customers_phone: 'Phone',
    customers_total_debt: 'Total Debt',
    customers_overdue_debt: 'Overdue Debt',
    customers_created: 'Created',
    loading: 'Loading...',
    empty_list: 'No records',
    users_manual_title: 'Add User (Manual)',
    full_name: 'Full Name',
    role: 'Role',
    temp_password: 'Temporary Password',
    save: 'Save',
    users_bulk_title: 'Bulk Upload (Excel)',
    template_download: 'Download template',
    bulk_create: 'Create users',
    columns_hint: 'Columns: Full Name, email, 6-digit random password (auto), role (seller/accountant/manager)',
    preview: 'Preview',
    results: 'Results',
    download_results: 'Download results',
    users_list_title: 'Existing Users',
    manager: 'Manager',
    action: 'Action',
    assign_sellers: 'Assign sellers',
    assign_modal_title: 'Assign Sellers to Manager',
    select: 'Select',
    current_manager: 'Current Manager',
    select_all: 'Select all',
    clear: 'Clear',
    cancel: 'Cancel',
    close: 'Close',
    network_error: 'Network error',
    assign_error: 'Assignment error',
    email: 'Email',
    password: 'Password',
    logging_in: 'Submitting...',
    login_submit: 'Sign In',
    registering: 'Saving...',
    register_submit: 'Sign Up',
    company_not_found: 'Company not found',
    checking: 'Checking...',
    not_authorized: 'Not authorized',
    role_seller: 'Seller',
    role_manager: 'Manager',
    role_accountant: 'Accountant',
    role_admin: 'Admin',
    customer: 'Customer',
    due_date: 'Due Date',
    amount: 'Receivable Amount',
    currency: 'Currency',
    debt_type: 'Receivable Type',
    seller: 'Sales Rep',
    transaction_date: 'Transaction Date (optional)',
    save_debt: 'Save Receivable',
    debt_saved: 'Receivable saved',
    select_placeholder: 'Select',
    debts_list_title: 'Existing Receivables',
    debt_status: 'Status',
    created_at: 'Created',
    receivable_type_senet: 'Promissory Note',
    receivable_type_cek: 'Check',
    receivable_type_havale: 'Wire Transfer',
    settings_currencies_label: 'Currencies (comma-separated)',
    settings_receivable_types_label: 'Receivable Types (comma-separated)',
    saved: 'Saved',
    receivables_bulk_title: 'Bulk Receivables Upload (Excel)',
    bulk_receivables_create: 'Add Receivables',
  }
}

const I18nCtx = React.createContext<{ lang: Lang; t: (k: string) => string; setLang: (l: Lang) => void }>({ lang: 'tr', t: (k) => k, setLang: () => {} })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('tr')
  React.useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved) setLangState(saved)
  }, [])
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem('lang', l) }
  const t = (k: string) => dict[lang][k] ?? k
  const v = React.useMemo(() => ({ lang, t, setLang }), [lang])
  return <I18nCtx.Provider value={v}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  try {
    return React.useContext(I18nCtx)
  } catch {
    return { lang: 'tr', t: (k: string) => k, setLang: () => {} }
  }
}

export function tGlobal(key: string) {
  const lang = (typeof localStorage !== 'undefined' && (localStorage.getItem('lang') as 'tr'|'en'|null)) || 'tr'
  const d = dict[lang as 'tr'|'en']
  return d[key] ?? key
}

export function formatDateDisplay(d: string | Date | undefined, lang: 'tr' | 'en') {
  if (!d) return '—'
  const date = (d instanceof Date) ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (lang === 'tr') return `${day}/${m}/${y}`
  return `${y}-${m}-${day}`
}
