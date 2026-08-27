import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export default async function AuditPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return null
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('audit_log')
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log: any) => (
              <tr key={log.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {log.profiles?.full_name || log.profiles?.email || '—'}
                </td>
                <td className="px-4 py-3 text-white font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-slate-400">{log.entity_type || '—'}</td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No audit entries yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}