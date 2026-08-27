import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function SourcesPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: sources } = await supabase
    .from('approved_sources')
    .select('*, projects(name, platform)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Approved Sources</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {sources?.map((s: any) => (
              <tr key={s.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{s.website_name}</td>
                <td className="px-4 py-3"><a href={s.url} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 break-all">{s.url}</a></td>
                <td className="px-4 py-3 text-slate-300">{PLATFORM_LABELS[s.projects?.platform as keyof typeof PLATFORM_LABELS] || '—'}</td>
                <td className="px-4 py-3">
                  <span className={s.status === 'approved' ? 'text-green-400' : 'text-red-400'}>● {s.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">{s.purpose || '—'}</td>
              </tr>
            ))}
            {(!sources || sources.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No approved sources yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}