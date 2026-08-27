import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: tasks } = await supabase.from('tasks').select('status, assigned_to, created_at, completed_at')
  const { data: products } = await supabase.from('products').select('research_status, qa_status')
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role').eq('is_active', true)

  const stats = {
    tasksByStatus: {
      new: tasks?.filter(t => (t as any).status === 'new').length || 0,
      assigned: tasks?.filter(t => (t as any).status === 'assigned').length || 0,
      in_progress: tasks?.filter(t => (t as any).status === 'in_progress').length || 0,
      submitted: tasks?.filter(t => (t as any).status === 'submitted').length || 0,
      qa_pending: tasks?.filter(t => (t as any).status === 'qa_pending').length || 0,
      approved: tasks?.filter(t => (t as any).status === 'approved').length || 0,
      rejected: tasks?.filter(t => (t as any).status === 'rejected').length || 0,
      completed: tasks?.filter(t => (t as any).status === 'completed').length || 0,
    },
    productsByQA: {
      pending: products?.filter(p => (p as any).qa_status === 'pending').length || 0,
      approved: products?.filter(p => (p as any).qa_status === 'approved').length || 0,
      rejected: products?.filter(p => (p as any).qa_status === 'rejected').length || 0,
    },
    activeEmployees: profiles?.length || 0,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Task Status Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(stats.tasksByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-slate-400 capitalize">{status.replace('_', ' ')}</span>
                <span className="text-white font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Product QA Status</h2>
          <div className="space-y-2">
            {Object.entries(stats.productsByQA).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-slate-400 capitalize">{status}</span>
                <span className="text-white font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Team Overview</h2>
          <p className="text-sm text-slate-400">Active Employees: <span className="text-white font-medium">{stats.activeEmployees}</span></p>
        </div>
      </div>
    </div>
  )
}