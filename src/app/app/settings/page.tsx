import { getCurrentUser } from '@/lib/auth'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return null

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Organization</h2>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Company Name</label>
          <input type="text" defaultValue="UtilityHub" disabled
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Domain</label>
          <input type="text" defaultValue="app.utilityshub.com" disabled
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300" />
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Projects</h2>
        <p className="text-sm text-slate-400">4 default projects are pre-seeded: eBay, Amazon, GunBroker, Night Galaxy. Additional projects can be created from the Projects page.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Security</h2>
        <p className="text-sm text-slate-400">• HTTPS enforced via Vercel</p>
        <p className="text-sm text-slate-400">• Row-Level Security (RLS) active on all tables</p>
        <p className="text-sm text-slate-400">• Role-based access control at database level</p>
        <p className="text-sm text-slate-400">• Audit logging enabled</p>
      </div>
    </div>
  )
}