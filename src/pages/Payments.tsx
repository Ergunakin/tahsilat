import { useI18n } from '@/i18n'

export default function Payments() {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('nav_payments')}</h1>
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4">—</div>
    </div>
  )
}
