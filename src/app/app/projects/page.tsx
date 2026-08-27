import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'
import Link from 'next/link'

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        {(user.role === 'admin' || user.role === 'manager') && (
          <Link href="/app/projects/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + New Project
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((p: any) => (
          <Link
            key={p.id}
            href={`/app/projects/${p.id}`}
            className="block bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS]}`}>
                {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}
              </span>
              <span className={`text-xs ${p.status === 'active' ? 'text-green-400' : 'text-slate-500'}`}>● {p.status}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
            {p.description && <p className="text-sm text-slate-400">{p.description}</p>}
            <p className="text-xs text-slate-500 mt-3">Created {new Date(p.created_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}