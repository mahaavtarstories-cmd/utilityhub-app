import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'
import Link from 'next/link'

export default async function RulebooksPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, name, platform').order('name')
  
  // Get published rulebook for each project
  const { data: rulebooks } = await supabase
    .from('rulebooks')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Rulebooks</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects?.map((p: any) => {
          const published = rulebooks?.find((r: any) => r.project_id === p.id && r.status === 'published')
          const drafts = rulebooks?.filter((r: any) => r.project_id === p.id && r.status !== 'published' && r.status !== 'archived')
          return (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}/rulebook`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS]}`}>
                  {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}
                </span>
                <span className="text-xs text-slate-400">{p.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {published ? (
                  <>
                    <span className="text-green-400">● Published v{published.version}</span>
                    {drafts && drafts.length > 0 && (
                      <span className="text-yellow-400">● {drafts.length} draft(s)</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">No rulebook yet</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}