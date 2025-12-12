import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'

export default function Empty({ title }: { title?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('flex h-full items-center justify-center')}>{title ?? t('empty_list')}</div>
  )
}
