import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { Profile, Project, Task } from '@/lib/types'
import { PLATFORM_LABELS, PLATFORM_COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS, ROLE_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  // Fetch data based on role
  const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: true })
  const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true })

  // Tasks: admin/manager see all, others see assigned
  let tasksQuery = supabase.from('tasks').select('*')
  if (user.role === 'researcher' || user.role === 'qa') {
    tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},qa_assigned_to.eq.${user.id}`)
  }
  const { data: tasks } = await tasksQuery.order('created_at', { ascending: false }).limit(50)

  // Stats
  const taskStats = {
    total: tasks?.length || 0,
    new: tasks?.filter(t => t.status === 'new').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    qa_pending: tasks?.filter(t => t.status === 'qa_pending').length || 0,
    approved: tasks?.filter(t => t.status === 'approved').length || 0,
    rejected: tasks?.filter(t => t.status === 'rejected').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back, {user.full_name || user.email}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total Tasks" value={taskStats.total} color="bg-slate-800 text-white" />
        <StatCard label="New" value={taskStats.new} color={TASK_STATUS_COLORS.new} />
        <StatCard label="In Progress" value={taskStats.in_progress} color={TASK_STATUS_COLORS.in_progress} />
        <StatCard label="QA Pending" value={taskStats.qa_pending} color={TASK_STATUS_COLORS.qa_pending} />
        <StatCard label="Approved" value={taskStats.approved} color={TASK_STATUS_COLORS.approved} />
        <StatCard label="Rejected" value={taskStats.rejected} color={TASK_STATUS_COLORS.rejected} />
        <StatCard label="Completed" value={taskStats.completed} color={TASK_STATUS_COLORS.completed} />
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          {(user.role === 'admin' || user.role === 'manager') && (
            <Link href="/app/projects/new" className="text-sm text-blue-400 hover:text-blue-300">+ New Project</Link>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {projects?.map((p: any) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded border ${PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS]}`}>
                  {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}
                </span>
                <span className={`text-xs ${p.status === 'active' ? 'text-green-400' : 'text-slate-500'}`}>● {p.status}</span>
              </div>
              <h3 className="font-semibold text-white">{p.name}</h3>
              {p.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent tasks */}
      {tasks && tasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Tasks</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-2 font-medium">Task</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 10).map((t: any) => (
                  <tr key={t.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-2">
                      <Link href={`/app/tasks/${t.id}`} className="text-white hover:text-blue-400">{t.title}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${TASK_STATUS_COLORS[t.status as keyof typeof TASK_STATUS_COLORS]}`}>
                        {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400 hidden md:table-cell">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color.split(' ')[1] || 'text-white'}`}>{value}</p>
    </div>
  )
}