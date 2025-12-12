import { useTenant } from '@/stores/tenant'
import { useI18n } from '@/i18n'
import { useParams } from 'react-router-dom'

export default function Dashboard() {
  const { company } = useTenant()
  const { t } = useI18n()
  const { companySlug } = useParams()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{companySlug ?? 'company'} {t('dashboard_title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4"><div className="text-sm text-neutral-600 dark:text-neutral-400">{t('card_customers')}</div><div className="text-xl font-medium">—</div></div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4"><div className="text-sm text-neutral-600 dark:text-neutral-400">{t('card_active_debts')}</div><div className="text-xl font-medium">—</div></div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4"><div className="text-sm text-neutral-600 dark:text-neutral-400">{t('card_overdue_amount')}</div><div className="text-xl font-medium">—</div></div>
      </div>
    </div>
  )
}
