import { cn } from '@/lib/utils'

export default function Empty({ title = 'Empty' }: { title?: string }) {
  return (
    <div className={cn('flex h-full items-center justify-center')}>{title}</div>
  )
}
