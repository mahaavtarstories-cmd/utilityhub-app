import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS, PLATFORM_COLORS, ROLE_LABELS } from '@/lib/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  const { data: members } = await supabase
    .from('project_members')
    .select('*, profiles!inner(email, full_name, role)')
    .eq('project_id', id)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: products } = await supabase
    .from('products')
    .select('id, brand, mpn, upc, product_name, research_status, qa_status')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const p = project as any

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS]}`}>
            {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}
          </span>
          <span className={`text-xs ${p.status === 'active' ? 'text-green-400' : 'text-slate-500'}`}>● {p.status}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{p.name}</h1>
        {p.description && <p className="text-slate-400 mt-1">{p.description}</p>}
      </div>

      {/* Quick actions */}
      {(user.role === 'admin' || user.role === 'manager') && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/projects/${id}/members`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">Manage Members</Link>
          <Link href={`/app/projects/${id}/rulebook`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">Rulebook</Link>
          <Link href={`/app/projects/${id}/sources`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">Approved Sources</Link>
          <Link href={`/app/projects/${id}/batch`} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg">⚡ Batch Pipeline</Link>
          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <Link href={`/app/projects/${id}/import`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Import Excel</Link>
              <Link href={`/app/projects/${id}/export`} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Export</Link>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Tasks</p>
          <p className="text-2xl font-bold text-white">{tasks?.length || 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Products</p>
          <p className="text-2xl font-bold text-white">{products?.length || 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Team Members</p>
          <p className="text-2xl font-bold text-white">{members?.length || 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Platform</p>
          <p className="text-lg font-bold text-white">{PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS]}</p>
        </div>
      </div>

      {/* Recent products */}
      {products && products.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Products</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-2 font-medium">Brand</th>
                  <th className="px-4 py-2 font-medium">MPN</th>
                  <th className="px-4 py-2 font-medium">UPC</th>
                  <th className="px-4 py-2 font-medium">Research</th>
                  <th className="px-4 py-2 font-medium">QA</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod: any) => (
                  <tr key={prod.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-white">{prod.brand || '—'}</td>
                    <td className="px-4 py-2 text-slate-300">{prod.mpn || '—'}</td>
                    <td className="px-4 py-2 text-slate-300">{prod.upc || '—'}</td>
                    <td className="px-4 py-2 text-slate-300">{prod.research_status}</td>
                    <td className="px-4 py-2 text-slate-300">{prod.qa_status}</td>
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