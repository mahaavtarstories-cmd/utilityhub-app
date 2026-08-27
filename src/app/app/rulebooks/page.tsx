import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'
import Link from 'next/link'

export default async function RulebooksPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, name, platform').order('name')

  const { data: rulebooks } = await supabase
    .from('rulebooks')
    .select('id, project_id, version, status, created_at, published_at, change_reason')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Rulebooks</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects?.map((p: any) => {
          const projectRulebooks = rulebooks?.filter((r: any) => r.project_id === p.id) || []
          const published = projectRulebooks.find((r: any) => r.status === 'published')
          const drafts = projectRulebooks.filter((r: any) => ['draft', 'under_review', 'approved'].includes(r.status))
          const archived = projectRulebooks.filter((r: any) => r.status === 'archived')

          return (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}/rulebook`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS]}`}>
                  {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}
                </span>
                <span className="text-xs text-slate-400">{p.name}</span>
              </div>

              <div className="space-y-1 text-sm">
                {published ? (
                  <p className="text-green-400">● Published v{published.version}</p>
                ) : (
                  <p className="text-slate-500">○ No published version</p>
                )}
                {drafts.length > 0 && (
                  <p className="text-yellow-400">● {drafts.length} pending draft(s)</p>
                )}
                {archived.length > 0 && (
                  <p className="text-slate-500">📁 {archived.length} archived version(s)</p>
                )}
                <p className="text-slate-400 text-xs mt-1">Total: {projectRulebooks.length} version(s)</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}