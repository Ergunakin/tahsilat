import { useTenant } from '@/stores/tenant'

export default function Dashboard() {
  const { company } = useTenant()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{company ? company.name : 'Şirket'} Panosu</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4"><div className="text-sm text-neutral-600 dark:text-neutral-400">Customers</div><div className="text-xl font-medium">—</div></div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4"><div className="text-sm text-neutral-600 dark:text-neutral-400">Active Debts</div><div className="text-xl font-medium">—</div></div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4"><div className="text-sm text-neutral-600 dark:text-neutral-400">Overdue Amount</div><div className="text-xl font-medium">—</div></div>
      </div>
    </div>
  )
}

