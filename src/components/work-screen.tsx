'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/types'

interface WorkScreenProps {
  taskId: string
  task: any
  product: any
  project: any
  rulebook: any
  userRole: string
  userId: string
}

export default function WorkScreen({ taskId, task, product, project, rulebook, userRole, userId }: WorkScreenProps) {
  const router = useRouter()
  const supabase = createClient()

  const [productData, setProductData] = useState({
    product_name: product?.product_name || '',
    description: product?.description || '',
    manufacturer_url: product?.manufacturer_url || '',
    product_url: product?.product_url || '',
    weight: product?.weight || '',
    material: product?.material || '',
    color: product?.color || '',
  })
  const [qaComment, setQaComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showRulebook, setShowRulebook] = useState(false)

  async function doAction(action: string, extra?: any) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const res = await fetch('/api/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, action, ...extra })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error) }
    else { setSuccess(`Task ${action} successful — status: ${data.status}`); router.refresh() }
    setLoading(false)
  }

  async function saveProduct() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('products').update({
      ...productData,
      updated_by: userId,
      research_status: 'in_progress'
    }).eq('id', product.id)
    if (error) setError(error.message)
    else setSuccess('Product saved')
    setLoading(false)
  }

  const canWork = (task.assigned_to === userId || ['admin', 'manager'].includes(userRole)) &&
    ['assigned', 'in_progress', 'rejected'].includes(task.status)
  const canQA = ['admin', 'manager', 'qa'].includes(userRole) && task.status === 'qa_pending'

  // Show rulebook panel
  const rb = rulebook
  const titleRules = rb?.title_rules
  const descRules = rb?.description_rules

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white">← Back</button>
          <h1 className="text-2xl font-bold text-white mt-2">{task.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded ${TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS]}`}>
              {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS]}
            </span>
            <span className="text-sm text-slate-400">{project?.name}</span>
          </div>
        </div>
        <button onClick={() => setShowRulebook(!showRulebook)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">
          📖 {showRulebook ? 'Hide' : 'Show'} Rulebook
        </button>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="text-sm text-green-400 bg-green-950/50 border border-green-800 rounded-lg px-3 py-2">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main work area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product info (read-only context) */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Product Reference</h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Brand</p><p className="text-white">{product?.brand || '—'}</p></div>
              <div><p className="text-xs text-slate-400">MPN</p><p className="text-white">{product?.mpn || '—'}</p></div>
              <div><p className="text-xs text-slate-400">UPC</p><p className="text-white">{product?.upc || '—'}</p></div>
            </div>
            {product?.manufacturer_url && (
              <a href={product.manufacturer_url} target="_blank" rel="noopener"
                className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300">Open Manufacturer Page ↗</a>
            )}
            {product?.product_url && (
              <a href={product.product_url} target="_blank" rel="noopener"
                className="inline-block mt-3 ml-4 text-sm text-blue-400 hover:text-blue-300">Open Source URL ↗</a>
            )}
          </div>

          {/* Editable fields */}
          {canWork && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">Work Data Entry</h2>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Product Name / Title</label>
                <input value={productData.product_name}
                  onChange={e => setProductData({...productData, product_name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {titleRules && (
                  <p className="text-xs text-slate-500 mt-1">
                    Rule: {titleRules.format} | Max {titleRules.max_length} chars | {productData.product_name.length} chars
                    {productData.product_name.length > (titleRules.max_length || 80) && (
                      <span className="text-red-400"> ⚠ Exceeds limit!</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Description</label>
                <textarea value={productData.description}
                  onChange={e => setProductData({...productData, description: e.target.value})}
                  rows={12}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                {descRules && (
                  <p className="text-xs text-slate-500 mt-1">
                    Format: {descRules.format} | Layout: {descRules.layout}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Weight</label>
                  <input value={productData.weight}
                    onChange={e => setProductData({...productData, weight: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Material</label>
                  <input value={productData.material}
                    onChange={e => setProductData({...productData, material: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Color</label>
                  <input value={productData.color}
                    onChange={e => setProductData({...productData, color: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Manufacturer URL</label>
                  <input value={productData.manufacturer_url}
                    onChange={e => setProductData({...productData, manufacturer_url: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={saveProduct} disabled={loading}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm rounded-lg">Save Draft</button>
                <button onClick={() => doAction('start')} disabled={loading || task.status !== 'assigned'}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm rounded-lg">Start Work</button>
                <button onClick={() => doAction('submit', { updates: productData })} disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg">Submit for QA</button>
              </div>
            </div>
          )}

          {/* QA panel */}
          {canQA && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
              <h2 className="text-lg font-semibold text-white">QA Review</h2>
              <p className="text-sm text-slate-400">Review the submitted work below. Approve or reject with a reason.</p>
              <div className="flex gap-2">
                <button onClick={() => doAction('approve')} disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg">✓ Approve</button>
                <input value={qaComment} onChange={e => setQaComment(e.target.value)}
                  placeholder="Rejection reason (required for reject)…"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                <button onClick={() => doAction('reject', { comment: qaComment })} disabled={loading || !qaComment}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg">✕ Reject</button>
              </div>
              {task.qa_comment && (
                <p className="text-sm text-red-400 mt-2">Previous QA comment: {task.qa_comment}</p>
              )}
            </div>
          )}

          {/* Read-only view (for non-workers) */}
          {!canWork && !canQA && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-3">Product Data</h2>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-slate-400">Product Name</p><p className="text-white">{productData.product_name || '—'}</p></div>
                {productData.description && (
                  <div><p className="text-xs text-slate-400">Description</p><p className="text-slate-300 whitespace-pre-wrap">{productData.description}</p></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rulebook sidebar */}
        {showRulebook && rb && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-3">📋 {project?.name} Rulebook v{rb.version}</h2>

            {titleRules && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Title Rules</h3>
                <p className="text-xs text-slate-400 mb-1">Format: {titleRules.format}</p>
                <p className="text-xs text-slate-400 mb-1">Max: {titleRules.max_length} chars</p>
                <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                  {titleRules.rules?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {descRules && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Description Rules</h3>
                <p className="text-xs text-slate-400 mb-1">Format: {descRules.format}</p>
                <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                  {descRules.rules?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {rb.image_rules && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Image Rules</h3>
                <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                  {rb.image_rules.rules?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {rb.qa_rules && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-1">QA Checklist</h3>
                <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                  {rb.qa_rules.checks?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {rb.custom_rules && Object.keys(rb.custom_rules).length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Additional Rules</h3>
                {Object.entries(rb.custom_rules).map(([key, value]: [string, any]) => (
                  <div key={key} className="mb-2">
                    <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                    {value.rules && (
                      <ul className="text-xs text-slate-300 list-disc list-inside">
                        {value.rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                    {value.checks && (
                      <ul className="text-xs text-slate-300 list-disc list-inside">
                        {value.checks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}