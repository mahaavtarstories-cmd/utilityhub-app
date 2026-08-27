'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GlobalRulesPanel() {
  const supabase = createClient()
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    const { data, error } = await supabase.from('global_rules').select('*').order('category', { ascending: true }).order('label', { ascending: true })
    if (error) setError(error.message)
    else setRules(data || [])
    setLoading(false)
  }

  async function updateRule(id: string, value: string) {
    setSaving(id)
    setError(null)
    setSuccess(null)
    const { error } = await supabase.from('global_rules').update({ value, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setError(error.message) }
    else {
      setRules(prev => prev.map(r => r.id === id ? { ...r, value } : r))
      setSuccess('Rule updated — applies to all platforms')
    }
    setSaving(null)
  }

  // Group rules by category
  const categories: Record<string, any[]> = {}
  rules.forEach(r => {
    if (!categories[r.category]) categories[r.category] = []
    categories[r.category].push(r)
  })

  const categoryLabels: Record<string, string> = {
    title: '📋 Title Rules (All Platforms)',
    description: '📝 Description Rules (All Platforms)',
  }

  if (loading) return <div className="text-slate-400">Loading rules…</div>

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="text-sm text-green-400 bg-green-950/50 border border-green-800 rounded-lg px-3 py-2">{success}</div>}

      {Object.entries(categories).map(([cat, catRules]) => (
        <div key={cat} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">{categoryLabels[cat] || cat}</h2>
          <div className="space-y-3">
            {catRules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-sm text-slate-300">{rule.label}</label>
                  {rule.type === 'text' && (
                    <p className="text-xs text-slate-500 mt-0.5">Current: <span className="text-slate-400">{rule.value || '—'}</span></p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {rule.type === 'checkbox' ? (
                    <button
                      onClick={() => updateRule(rule.id, rule.value === 'true' ? 'false' : 'true')}
                      disabled={saving === rule.id}
                      className={`relative w-12 h-6 rounded-full transition-colors ${rule.value === 'true' ? 'bg-green-600' : 'bg-slate-600'} disabled:opacity-50`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${rule.value === 'true' ? 'translate-x-6' : ''}`} />
                    </button>
                  ) : rule.type === 'number' ? (
                    <input
                      type="number"
                      defaultValue={rule.value}
                      onBlur={(e) => e.target.value !== rule.value && updateRule(rule.id, e.target.value)}
                      className="w-20 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      defaultValue={rule.value}
                      onBlur={(e) => e.target.value !== rule.value && updateRule(rule.id, e.target.value)}
                      className="w-40 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Preview */}
      <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">ℹ️ How Global Rules Work</h2>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• These rules apply to <span className="text-white font-medium">all 4 platforms</span> (eBay, Amazon, GunBroker, Night Galaxy)</li>
          <li>• Platform-specific rulebooks can override or add to these rules</li>
          <li>• AI assistance uses these rules when generating titles/descriptions</li>
          <li>• QA checks validate against these rules when reviewing work</li>
          <li>• Changes take effect immediately — no deploy needed</li>
        </ul>
      </div>
    </div>
  )
}