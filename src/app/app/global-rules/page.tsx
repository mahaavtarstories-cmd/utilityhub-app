import { getCurrentUser } from '@/lib/auth'
import GlobalRulesPanel from '@/components/global-rules'

export default async function GlobalRulesPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Global Rules</h1>
        <p className="text-sm text-slate-400 mt-1">Set rules once — applies across all platforms (eBay, Amazon, GunBroker, Night Galaxy)</p>
      </div>
      <GlobalRulesPanel />
    </div>
  )
}