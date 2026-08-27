import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function RulebookDetailPage({ params }: { params: Promise<{ id: string; rulebookId: string }> }) {
  const { id, rulebookId } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: rulebook } = await supabase
    .from('rulebooks')
    .select('*, projects(name, platform)')
    .eq('id', rulebookId)
    .single()

  if (!rulebook) notFound()
  const rb = rulebook as any

  const canEdit = ['admin', 'manager'].includes(user.role)

  const sections = [
    { key: 'title_rules', label: 'Title Rules', data: rb.title_rules },
    { key: 'description_rules', label: 'Description Rules', data: rb.description_rules },
    { key: 'image_rules', label: 'Image Rules', data: rb.image_rules },
    { key: 'category_rules', label: 'Category Rules', data: rb.category_rules },
    { key: 'qa_rules', label: 'QA Rules', data: rb.qa_rules },
    { key: 'custom_rules', label: 'Custom Rules', data: rb.custom_rules },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={`/app/projects/${id}/rulebook`} className="text-sm text-slate-400 hover:text-white">← Rulebook</Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-white">v{rb.version}</h1>
          <span className={`text-xs px-2 py-1 rounded ${
            rb.status === 'published' ? 'bg-green-100 text-green-700' :
            rb.status === 'draft' ? 'bg-gray-100 text-gray-700' :
            rb.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
            rb.status === 'approved' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>{rb.status.replace('_', ' ')}</span>
        </div>
        <p className="text-sm text-slate-400 mt-1">{rb.projects?.name}</p>
        {rb.change_reason && <p className="text-sm text-slate-400 mt-1">Reason: {rb.change_reason}</p>}
        <p className="text-xs text-slate-500 mt-1">Created {new Date(rb.created_at).toLocaleString()}</p>
      </div>

      {/* Status workflow actions */}
      {canEdit && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-2">
          <span className="text-sm text-slate-400 self-center mr-2">Status actions:</span>
          {rb.status === 'draft' && (
            <form action={`/app/projects/${id}/rulebook/${rulebookId}/transition`} method="POST">
              <input type="hidden" name="action" value="submit_review" />
              <button type="submit" className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg">Submit for Review</button>
            </form>
          )}
          {rb.status === 'under_review' && user.role === 'admin' && (
            <>
              <form action={`/app/projects/${id}/rulebook/${rulebookId}/transition`} method="POST">
                <input type="hidden" name="action" value="approve" />
                <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Approve</button>
              </form>
              <form action={`/app/projects/${id}/rulebook/${rulebookId}/transition`} method="POST">
                <input type="hidden" name="action" value="reject_review" />
                <button type="submit" className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">Send Back to Draft</button>
              </form>
            </>
          )}
          {rb.status === 'approved' && user.role === 'admin' && (
            <form action={`/app/projects/${id}/rulebook/${rulebookId}/transition`} method="POST">
              <input type="hidden" name="action" value="publish" />
              <button type="submit" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Publish (replaces current)</button>
            </form>
          )}
          {canEdit && rb.status !== 'archived' && rb.status !== 'published' && (
            <form action={`/app/projects/${id}/rulebook/${rulebookId}/transition`} method="POST">
              <input type="hidden" name="action" value="archive" />
              <button type="submit" className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">Archive</button>
            </form>
          )}
          {canEdit && (
            <Link href={`/app/projects/${id}/rulebook/new?from=${rulebookId}`}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">Create New Version from This</Link>
          )}
        </div>
      )}

      {/* Rule sections */}
      {sections.map(section => {
        if (!section.data) return null
        return (
          <div key={section.key} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">{section.label}</h2>

            {/* Format/target */}
            {section.data.format && <p className="text-sm text-slate-300 mb-1"><span className="text-slate-400">Format:</span> {section.data.format}</p>}
            {section.data.max_length && <p className="text-sm text-slate-300 mb-1"><span className="text-slate-400">Max Length:</span> {section.data.max_length}</p>}
            {section.data.target_length && <p className="text-sm text-slate-300 mb-1"><span className="text-slate-400">Target:</span> {section.data.target_length}</p>}
            {section.data.layout && <p className="text-sm text-slate-300 mb-1"><span className="text-slate-400">Layout:</span> {section.data.layout}</p>}

            {/* Rules list */}
            {section.data.rules && Array.isArray(section.data.rules) && section.data.rules.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Rules:</p>
                <ul className="text-sm text-slate-300 list-disc list-inside space-y-0.5">
                  {section.data.rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {/* Checks list */}
            {section.data.checks && Array.isArray(section.data.checks) && section.data.checks.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Checks:</p>
                <ul className="text-sm text-slate-300 list-disc list-inside space-y-0.5">
                  {section.data.checks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {/* Sections object */}
            {section.data.sections && typeof section.data.sections === 'object' && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Sections:</p>
                <div className="space-y-1">
                  {Object.entries(section.data.sections).map(([key, value]: [string, any]) => (
                    <div key={key} className="text-sm">
                      <span className="text-slate-400">{key}:</span>{' '}
                      <span className="text-slate-300">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            {section.data.examples_good && (
              <div className="mt-2">
                <p className="text-xs text-green-400 mb-1">✅ Good Examples:</p>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {section.data.examples_good.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {section.data.examples_bad && (
              <div className="mt-2">
                <p className="text-xs text-red-400 mb-1">❌ Bad Examples:</p>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {section.data.examples_bad.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {/* Custom rules (nested objects) */}
            {section.key === 'custom_rules' && typeof section.data === 'object' && (
              <div className="mt-3 space-y-3">
                {Object.entries(section.data).map(([key, value]: [string, any]) => (
                  <div key={key} className="border-t border-slate-700 pt-2">
                    <p className="text-sm font-medium text-blue-400 capitalize">{key.replace(/_/g, ' ')}</p>
                    {value.rules && (
                      <ul className="text-sm text-slate-300 list-disc list-inside mt-1">
                        {value.rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                    {value.checks && (
                      <ul className="text-sm text-slate-300 list-disc list-inside mt-1">
                        {value.checks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                    {typeof value === 'object' && !value.rules && !value.checks && (
                      <pre className="text-xs text-slate-300 mt-1 bg-slate-900/50 p-2 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}