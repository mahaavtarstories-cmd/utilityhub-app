'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RulebookEditor({ projectId, fromRulebook }: { projectId: string; fromRulebook: any }) {
  const router = useRouter()
  const supabase = createClient()

  const [version, setVersion] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [titleRules, setTitleRules] = useState(JSON.stringify(fromRulebook?.title_rules || { format: '', max_length: 80, rules: [] }, null, 2))
  const [descriptionRules, setDescriptionRules] = useState(JSON.stringify(fromRulebook?.description_rules || { format: '', layout: '', rules: [] }, null, 2))
  const [imageRules, setImageRules] = useState(JSON.stringify(fromRulebook?.image_rules || { rules: [] }, null, 2))
  const [categoryRules, setCategoryRules] = useState(JSON.stringify(fromRulebook?.category_rules || { rules: [] }, null, 2))
  const [qaRules, setQaRules] = useState(JSON.stringify(fromRulebook?.qa_rules || { checks: [] }, null, 2))
  const [customRules, setCustomRules] = useState(JSON.stringify(fromRulebook?.custom_rules || {}, null, 2))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(status: string) {
    setLoading(true)
    setError(null)
    try {
      // Parse JSON fields
      const payload = {
        project_id: projectId,
        version,
        status,
        change_reason: changeReason || null,
        title_rules: JSON.parse(titleRules),
        description_rules: JSON.parse(descriptionRules),
        image_rules: JSON.parse(imageRules),
        category_rules: JSON.parse(categoryRules),
        qa_rules: JSON.parse(qaRules),
        custom_rules: JSON.parse(customRules),
      }

      const { error } = await supabase.from('rulebooks').insert(payload)
      if (error) throw error

      router.push(`/app/projects/${projectId}/rulebook`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const jsonFields = [
    { label: 'Title Rules', value: titleRules, setter: setTitleRules, hint: 'format, max_length, target_length, rules[], examples_good[], examples_bad[]' },
    { label: 'Description Rules', value: descriptionRules, setter: setDescriptionRules, hint: 'format, layout, rules[], sections{}' },
    { label: 'Image Rules', value: imageRules, setter: setImageRules, hint: 'rules[]' },
    { label: 'Category Rules', value: categoryRules, setter: setCategoryRules, hint: 'rules[]' },
    { label: 'QA Rules', value: qaRules, setter: setQaRules, hint: 'checks[]' },
    { label: 'Custom Rules', value: customRules, setter: setCustomRules, hint: 'source_rules, column_mapping, configurable_rules, compliance_rules, seo_rules, etc.' },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Rulebook Version</h1>
        {fromRulebook && <p className="text-sm text-slate-400 mt-1">Based on v{fromRulebook.version} — edit and save as new version</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Version Number</label>
          <input value={version} onChange={e => setVersion(e.target.value)} required
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1.1, 2.0" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Change Reason</label>
          <input value={changeReason} onChange={e => setChangeReason(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What changed and why?" />
        </div>
      </div>

      <div className="space-y-4">
        {jsonFields.map((field) => (
          <div key={field.label}>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {field.label}
              <span className="text-xs text-slate-500 ml-2 font-normal">{field.hint}</span>
            </label>
            <textarea
              value={field.value}
              onChange={e => field.setter(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-green-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-3">
        <button onClick={() => handleSubmit('draft')} disabled={loading || !version}
          className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-medium rounded-lg">Save as Draft</button>
        <button onClick={() => handleSubmit('under_review')} disabled={loading || !version}
          className="px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-medium rounded-lg">Submit for Review</button>
        <button onClick={() => router.back()}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg">Cancel</button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">Workflow:</p>
        <p>Draft → Under Review → Approved → Published</p>
        <p className="mt-1">Only PUBLISHED versions are shown to employees during work. Previous published version is automatically archived.</p>
      </div>
    </div>
  )
}