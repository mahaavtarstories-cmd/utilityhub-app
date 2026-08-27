import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { TASK_STATUS_COLORS } from '@/lib/types'
import Link from 'next/link'

export default async function QAPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager', 'qa'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, projects(name, platform)')
    .eq('status', 'qa_pending')
    .order('submitted_at', { ascending: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">QA Queue</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks?.map((t: any) => (
              <tr key={t.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{t.title}</td>
                <td className="px-4 py-3 text-slate-300">{t.projects?.name}</td>
                <td className="px-4 py-3 text-slate-400">{t.submitted_at ? new Date(t.submitted_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/app/tasks/${t.id}`} className="text-blue-400 hover:text-blue-300 text-sm">Review →</Link>
                </td>
              </tr>
            ))}
            {(!tasks || tasks.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No items in QA queue</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}