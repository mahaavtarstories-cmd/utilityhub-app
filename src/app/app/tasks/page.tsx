import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PLATFORM_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function TasksPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  let query = supabase.from('tasks').select('*, projects(name, platform)')
  if (user.role === 'researcher') {
    query = query.eq('assigned_to', user.id)
  } else if (user.role === 'qa') {
    query = query.or(`status.eq.qa_pending,qa_assigned_to.eq.${user.id}`)
  }

  const { data: tasks } = await query.order('created_at', { ascending: false }).limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        {(user.role === 'admin' || user.role === 'manager') && (
          <Link href="/app/tasks/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + New Task
          </Link>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {tasks?.map((t: any) => (
              <tr key={t.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <Link href={`/app/tasks/${t.id}`} className="text-white hover:text-blue-400">{t.title}</Link>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {PLATFORM_LABELS[t.projects?.platform as keyof typeof PLATFORM_LABELS] || '—'} / {t.projects?.name || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${TASK_STATUS_COLORS[t.status as keyof typeof TASK_STATUS_COLORS]}`}>
                    {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!tasks || tasks.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No tasks yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}