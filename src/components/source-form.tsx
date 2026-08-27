'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SourceForm({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter()
  const [form, setForm] = useState({
    website_name: '', url: '', purpose: '', status: 'approved', priority: 0, notes: '', is_global: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('approved_sources').insert({
      project_id: projectId,
      ...form,
      priority: parseInt(String(form.priority)) || 0
    })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push(`/app/projects/${projectId}/sources`); router.refresh() }
  }

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Add Approved Source — {projectName}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Website Name</label>
          <input value={form.website_name} onChange={e => set('website_name', e.target.value)} required
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Mustad Official, Tackle Warehouse" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">URL</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} required type="url"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Purpose</label>
          <select value={form.purpose} onChange={e => set('purpose', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select —</option>
            <option value="Manufacturer website">Manufacturer website</option>
            <option value="Distributor">Distributor</option>
            <option value="Retailer — Primary">Retailer — Primary</option>
            <option value="Retailer — Secondary">Retailer — Secondary</option>
            <option value="Brand catalogue">Brand catalogue</option>
            <option value="Marketplace">Marketplace</option>
            <option value="UPC database">UPC database</option>
            <option value="Reference / Specification">Reference / Specification</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="approved">Approved</option>
              <option value="limited">Limited</option>
              <option value="not_approved">Not Approved</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Priority (0=highest)</label>
            <input type="number" value={form.priority} onChange={e => set('priority', e.target.value)} min={0}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-800 rounded-lg p-3">
          <input type="checkbox" id="is_global" checked={form.is_global} onChange={e => set('is_global', e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600" />
          <label htmlFor="is_global" className="text-sm text-slate-300 cursor-pointer">
            <span className="font-medium text-white">🌍 Available for all projects</span>
            <span className="block text-xs text-slate-400">Check this to share this source across eBay, Amazon, GunBroker, and Night Galaxy</span>
          </label>
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg">
            {loading ? 'Adding…' : 'Add Source'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg">Cancel</button>
        </div>
      </form>
    </div>
  )
}