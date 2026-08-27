import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SourceForm from '@/components/source-form'

export default async function ProjectSourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  if (!project) notFound()

  const { data: sources } = await supabase
    .from('approved_sources')
    .select('*')
    .eq('project_id', id)
    .order('priority', { ascending: true })

  const canEdit = ['admin', 'manager'].includes(user.role)

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    limited: 'bg-yellow-100 text-yellow-700',
    not_approved: 'bg-red-100 text-red-700',
    pending: 'bg-orange-100 text-orange-700'
  }

  // Group by status
  const grouped = {
    approved: sources?.filter((s: any) => s.status === 'approved') || [],
    limited: sources?.filter((s: any) => s.status === 'limited') || [],
    pending: sources?.filter((s: any) => s.status === 'pending') || [],
    not_approved: sources?.filter((s: any) => s.status === 'not_approved') || [],
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/projects/${id}`} className="text-sm text-slate-400 hover:text-white">← {project.name}</Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-white">Approved Sources — {project.name}</h1>
          {canEdit && (
            <Link href={`/app/projects/${id}/sources/new`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ Add Source</Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Approved</p>
          <p className="text-2xl font-bold text-green-400">{grouped.approved.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Limited</p>
          <p className="text-2xl font-bold text-yellow-400">{grouped.limited.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-orange-400">{grouped.pending.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Not Approved</p>
          <p className="text-2xl font-bold text-red-400">{grouped.not_approved.length}</p>
        </div>
      </div>

      {/* Sources table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Purpose</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sources?.map((s: any) => (
              <tr key={s.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{s.website_name}</td>
                <td className="px-4 py-3"><a href={s.url} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 break-all">{s.url}</a></td>
                <td className="px-4 py-3 text-slate-300">{s.purpose || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>{s.status.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{s.priority}</td>
                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{s.notes || '—'}</td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <form action={`/app/projects/${id}/sources/${s.id}/delete`} method="POST" className="inline">
                      <button type="submit" className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {(!sources || sources.length === 0) && (
              <tr><td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-slate-500">No sources yet. Add manufacturer websites, distributors, retailers.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">Source Status Guide:</p>
        <ul className="space-y-1">
          <li><span className="text-green-400">● Approved</span> — Primary research source, trusted for product data</li>
          <li><span className="text-yellow-400">● Limited</span> — Use for cross-reference only, don't rely as primary</li>
          <li><span className="text-orange-400">● Pending</span> — Awaiting review before approval</li>
          <li><span className="text-red-400">● Not Approved</span> — Do not use for research</li>
        </ul>
      </div>
    </div>
  )
}