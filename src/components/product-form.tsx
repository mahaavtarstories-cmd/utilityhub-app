'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewProductPage({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [form, setForm] = useState({
    internal_sku: '', brand: '', manufacturer: '', mpn: '', upc: '', model: '',
    product_name: '', manufacturer_url: '', product_url: '', description: '',
    weight: '', material: '', color: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('products').insert({
      project_id: projectId,
      ...form,
      research_status: 'pending',
      qa_status: 'pending'
    })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push(`/app/projects/${projectId}`); router.refresh() }
  }

  const fields = [
    ['internal_sku', 'Internal SKU'], ['brand', 'Brand'], ['manufacturer', 'Manufacturer'],
    ['mpn', 'MPN'], ['upc', 'UPC'], ['model', 'Model'],
    ['product_name', 'Product Name'], ['weight', 'Weight'], ['material', 'Material'], ['color', 'Color']
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-slate-300 mb-1">{label}</label>
              <input value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Manufacturer URL</label>
          <input value={form.manufacturer_url} onChange={e => set('manufacturer_url', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://brand.com/product..." />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Product URL</label>
          <input value={form.product_url} onChange={e => set('product_url', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg">
            {loading ? 'Creating…' : 'Create Product'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg">Cancel</button>
        </div>
      </form>
    </div>
  )
}