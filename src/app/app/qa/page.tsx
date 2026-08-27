import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'

export default async function QAPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager', 'qa'].includes(user.role)) return null
  const supabase = await createClient()

  // QA pending tasks with product + project info
  const { data: pendingTasks } = await supabase
    .from('tasks')
    .select(`
      id, title, description, status, submitted_at, qa_comment,
      assigned_to, qa_assigned_to,
      projects(id, name, platform),
      products(id, brand, mpn, upc, product_name, description, manufacturer_url, product_url, weight, material, color)
    `)
    .eq('status', 'qa_pending')
    .order('submitted_at', { ascending: true })

  // Recent QA decisions (approved/rejected in last 30 days)
  const { data: recentDecisions } = await supabase
    .from('tasks')
    .select(`
      id, title, status, qa_comment, completed_at, submitted_at,
      projects(name, platform),
      profiles:assigned_to(email, full_name)
    `)
    .in('status', ['approved', 'rejected'])
    .order('completed_at', { ascending: false })
    .limit(20)

  // Stats
  const stats = {
    pending: pendingTasks?.length || 0,
    approved: recentDecisions?.filter((t: any) => t.status === 'approved').length || 0,
    rejected: recentDecisions?.filter((t: any) => t.status === 'rejected').length || 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">QA Queue</h1>
        <p className="text-sm text-slate-400 mt-1">Review submitted work — approve or reject with feedback</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 border border-orange-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Pending Review</p>
          <p className="text-3xl font-bold text-orange-400">{stats.pending}</p>
        </div>
        <div className="bg-slate-800 border border-green-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Approved (recent)</p>
          <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
        </div>
        <div className="bg-slate-800 border border-red-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Rejected (recent)</p>
          <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Pending review queue */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Awaiting Review</h2>
        {pendingTasks && pendingTasks.length > 0 ? (
          <div className="space-y-3">
            {pendingTasks.map((task: any) => (
              <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${PLATFORM_COLORS[task.projects?.platform as keyof typeof PLATFORM_COLORS]}`}>
                        {PLATFORM_LABELS[task.projects?.platform as keyof typeof PLATFORM_LABELS]}
                      </span>
                      <span className="text-xs text-slate-400">{task.projects?.name}</span>
                      <span className="text-xs text-orange-400">● QA Pending</span>
                    </div>
                    <h3 className="font-semibold text-white">{task.title}</h3>
                    {task.products && (
                      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                        <div><p className="text-xs text-slate-400">Brand</p><p className="text-white">{task.products.brand || '—'}</p></div>
                        <div><p className="text-xs text-slate-400">MPN</p><p className="text-white">{task.products.mpn || '—'}</p></div>
                        <div><p className="text-xs text-slate-400">UPC</p><p className="text-white">{task.products.upc || '—'}</p></div>
                        <div><p className="text-xs text-slate-400">Product</p><p className="text-white truncate">{task.products.product_name || '—'}</p></div>
                      </div>
                    )}
                    {task.submitted_at && (
                      <p className="text-xs text-slate-500 mt-2">Submitted: {new Date(task.submitted_at).toLocaleString()}</p>
                    )}
                  </div>
                  <Link href={`/app/tasks/${task.id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg whitespace-nowrap ml-4">
                    Review →
                  </Link>
                </div>

                {/* Preview description snippet */}
                {task.products?.description && (
                  <div className="mt-3 bg-slate-900/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs text-slate-400 mb-1">Description preview:</p>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-4">{task.products.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-500">
            No items in QA queue. Submitted tasks will appear here for review.
          </div>
        )}
      </div>

      {/* Recent decisions */}
      {recentDecisions && recentDecisions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Recent QA Decisions</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Researcher</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                  <th className="px-4 py-3 font-medium">Comment</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.map((t: any) => (
                  <tr key={t.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <Link href={`/app/tasks/${t.id}`} className="text-white hover:text-blue-400">{t.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{PLATFORM_LABELS[t.projects?.platform as keyof typeof PLATFORM_LABELS] || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{t.profiles?.full_name || t.profiles?.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{t.qa_comment || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : '—'}</td>
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