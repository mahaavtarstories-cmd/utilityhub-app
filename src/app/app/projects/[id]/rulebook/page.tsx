import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'
import RulebookEditor from './rulebook-editor'

export default async function RulebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  // Get all rulebook versions for this project
  const { data: rulebooks } = await supabase
    .from('rulebooks')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const published = rulebooks?.find((r: any) => r.status === 'published')
  const drafts = rulebooks?.filter((r: any) => ['draft', 'under_review', 'approved'].includes(r.status))
  const archived = rulebooks?.filter((r: any) => r.status === 'archived')

  const canEdit = ['admin', 'manager'].includes(user.role)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/rulebooks" className="text-sm text-slate-400 hover:text-white">← Rulebooks</Link>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[project.platform as keyof typeof PLATFORM_COLORS]}`}>
            {PLATFORM_LABELS[project.platform as keyof typeof PLATFORM_LABELS]}
          </span>
          <h1 className="text-2xl font-bold text-white">{project.name} Rulebook</h1>
        </div>
      </div>

      {/* Current published version */}
      {published && (
        <div className="bg-slate-800 border border-green-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Published Version: v{published.version}</h2>
              <p className="text-sm text-slate-400">Published {new Date(published.published_at).toLocaleDateString()} — Status: {published.status}</p>
              {published.change_reason && <p className="text-sm text-slate-400 mt-1">Reason: {published.change_reason}</p>}
            </div>
            <div className="flex gap-2">
              <Link href={`/app/projects/${id}/rulebook/${published.id}`}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">View Details</Link>
              {canEdit && (
                <Link href={`/app/projects/${id}/rulebook/new?from=${published.id}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">New Version</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drafts / Under Review / Approved */}
      {drafts && drafts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Pending Versions</h2>
          <div className="space-y-2">
            {drafts.map((rb: any) => (
              <div key={rb.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                    rb.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    rb.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{rb.status.replace('_', ' ')}</span>
                  <span className="text-white font-medium">v{rb.version}</span>
                  {rb.change_reason && <span className="text-sm text-slate-400 ml-2">— {rb.change_reason}</span>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/app/projects/${id}/rulebook/${rb.id}`}
                    className="text-sm text-blue-400 hover:text-blue-300">View →</Link>
                  {canEdit && rb.status === 'draft' && (
                    <form action={`/app/projects/${id}/rulebook/${rb.id}/transition`} method="POST" className="inline">
                      <input type="hidden" name="action" value="submit_review" />
                      <button type="submit" className="text-sm text-yellow-400 hover:text-yellow-300">Submit for Review</button>
                    </form>
                  )}
                  {canEdit && rb.status === 'under_review' && user.role === 'admin' && (
                    <form action={`/app/projects/${id}/rulebook/${rb.id}/transition`} method="POST" className="inline">
                      <input type="hidden" name="action" value="approve" />
                      <button type="submit" className="text-sm text-blue-400 hover:text-blue-300">Approve</button>
                    </form>
                  )}
                  {canEdit && rb.status === 'approved' && user.role === 'admin' && (
                    <form action={`/app/projects/${id}/rulebook/${rb.id}/transition`} method="POST" className="inline">
                      <input type="hidden" name="action" value="publish" />
                      <button type="submit" className="text-sm text-green-400 hover:text-green-300">Publish</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version History */}
      {archived && archived.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Version History</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...(published ? [published] : []), ...(archived || [])].map((rb: any) => (
                  <tr key={rb.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white">v{rb.version}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        rb.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>{rb.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{new Date(rb.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-400">{rb.published_at ? new Date(rb.published_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{rb.change_reason || '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/app/projects/${id}/rulebook/${rb.id}`} className="text-blue-400 hover:text-blue-300 text-sm">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New version button */}
      {canEdit && (
        <div>
          <Link href={`/app/projects/${id}/rulebook/new${published ? `?from=${published.id}` : ''}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Create New Version
          </Link>
        </div>
      )}
    </div>
  )
}