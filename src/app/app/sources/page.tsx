import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'
import Link from 'next/link'

export default async function SourcesPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, name, platform').order('name')

  const { data: sources } = await supabase
    .from('approved_sources')
    .select('id, project_id, website_name, url, purpose, status, priority, projects(name, platform)')
    .order('priority', { ascending: true })

  const statusColors: Record<string, string> = {
    approved: 'text-green-400',
    limited: 'text-yellow-400',
    pending: 'text-orange-400',
    not_approved: 'text-red-400'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Approved Sources</h1>

      {/* Per-project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {projects?.map((p: any) => {
          const projectSources = sources?.filter((s: any) => s.project_id === p.id) || []
          const approvedCount = projectSources.filter((s: any) => s.status === 'approved').length
          return (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}/sources`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-600 transition-colors"
            >
              <span className={`text-xs px-2 py-0.5 rounded border ${PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS]}`}>
                {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}
              </span>
              <p className="text-white font-medium mt-2">{p.name}</p>
              <p className="text-xs text-slate-400 mt-1">{approvedCount} approved / {projectSources.length} total</p>
            </Link>
          )
        })}
      </div>

      {/* All sources table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Purpose</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sources?.map((s: any) => (
              <tr key={s.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{s.website_name}</td>
                <td className="px-4 py-3"><a href={s.url} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 break-all">{s.url}</a></td>
                <td className="px-4 py-3">
                  <Link href={`/app/projects/${s.project_id}/sources`} className="text-slate-300 hover:text-blue-400">
                    {PLATFORM_LABELS[s.projects?.platform as keyof typeof PLATFORM_LABELS] || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">{s.purpose || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${statusColors[s.status] || 'text-gray-400'}`}>● {s.status.replace('_', ' ')}</span>
                </td>
              </tr>
            ))}
            {(!sources || sources.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sources yet. Add from each project's Sources page.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}