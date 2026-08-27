'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AIPanelProps {
  productId: string
  projectId: string
  rulebook: any
  product: any
  onApply: (data: { product_name?: string; description?: string }) => void
}

export default function AIPanel({ productId, projectId, rulebook, product, onApply }: AIPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{
    title?: string
    description?: string
    specs?: Record<string, string>
  }>({})

  // Build rulebook context for AI
  const buildRuleContext = () => {
    if (!rulebook) return ''
    let ctx = `PROJECT RULEBOOK v${rulebook.version}\n\n`
    if (rulebook.title_rules) {
      ctx += `TITLE RULES:\n`
      ctx += `Format: ${rulebook.title_rules.format || 'N/A'}\n`
      ctx += `Max Length: ${rulebook.title_rules.max_length || 'N/A'}\n`
      if (rulebook.title_rules.rules) ctx += `Rules:\n${rulebook.title_rules.rules.map((r: string) => `- ${r}`).join('\n')}\n`
      ctx += '\n'
    }
    if (rulebook.description_rules) {
      ctx += `DESCRIPTION RULES:\n`
      ctx += `Format: ${rulebook.description_rules.format || 'N/A'}\n`
      ctx += `Layout: ${rulebook.description_rules.layout || 'N/A'}\n`
      if (rulebook.description_rules.rules) ctx += `Rules:\n${rulebook.description_rules.rules.map((r: string) => `- ${r}`).join('\n')}\n`
      ctx += '\n'
    }
    if (rulebook.qa_rules?.checks) {
      ctx += `QA CHECKLIST:\n${rulebook.qa_rules.checks.map((c: string) => `- ${c}`).join('\n')}\n`
    }
    return ctx
  }

  async function generateTitle() {
    setLoading('title')
    setError(null)
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_title',
        productId,
        projectId,
        ruleContext: buildRuleContext(),
        productData: { brand: product?.brand, mpn: product?.mpn, upc: product?.upc, product_name: product?.product_name }
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error) }
    else { setSuggestions(prev => ({ ...prev, title: data.title })) }
    setLoading(null)
  }

  async function generateDescription() {
    setLoading('description')
    setError(null)
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_description',
        productId,
        projectId,
        ruleContext: buildRuleContext(),
        productData: {
          brand: product?.brand, mpn: product?.mpn, upc: product?.upc,
          product_name: product?.product_name, manufacturer_url: product?.manufacturer_url,
          product_url: product?.product_url
        }
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error) }
    else { setSuggestions(prev => ({ ...prev, description: data.description })) }
    setLoading(null)
  }

  async function extractSpecs() {
    setLoading('specs')
    setError(null)
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extract_specs',
        productId,
        projectId,
        productData: {
          manufacturer_url: product?.manufacturer_url,
          product_url: product?.product_url,
          product_name: product?.product_name
        }
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error) }
    else { setSuggestions(prev => ({ ...prev, specs: data.specs })) }
    setLoading(null)
  }

  async function normalizeData() {
    setLoading('normalize')
    setError(null)
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'normalize',
        productId,
        productData: { weight: product?.weight, material: product?.material, color: product?.color }
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error) }
    else { setSuggestions(prev => ({ ...prev, specs: { ...prev.specs, ...data.normalized } })) }
    setLoading(null)
  }

  const titleLen = suggestions.title?.length || 0
  const titleMax = rulebook?.title_rules?.max_length || 80

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">🤖 AI Assistance</h2>
        {rulebook && (
          <span className="text-xs text-slate-400">Rulebook v{rulebook.version} active</span>
        )}
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}

      {/* AI Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={generateTitle} disabled={loading !== null}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
          {loading === 'title' ? '⏳' : '✨'} Generate Title
        </button>
        <button onClick={generateDescription} disabled={loading !== null}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
          {loading === 'description' ? '⏳' : '📝'} Generate Description
        </button>
        <button onClick={extractSpecs} disabled={loading !== null}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
          {loading === 'specs' ? '⏳' : '🔍'} Extract Specs
        </button>
        <button onClick={normalizeData} disabled={loading !== null}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
          {loading === 'normalize' ? '⏳' : '📐'} Normalize Data
        </button>
      </div>

      {/* Title suggestion */}
      {suggestions.title && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">AI Title Suggestion:</p>
            <div className="flex gap-2">
              <span className={`text-xs ${titleLen > titleMax ? 'text-red-400' : 'text-green-400'}`}>{titleLen}/{titleMax} chars</span>
              <button onClick={() => onApply({ product_name: suggestions.title })}
                className="text-xs text-blue-400 hover:text-blue-300">Apply →</button>
            </div>
          </div>
          <p className="text-sm text-slate-200">{suggestions.title}</p>
          {titleLen > titleMax && <p className="text-xs text-red-400 mt-1">⚠ Exceeds max length by {titleLen - titleMax} chars</p>}
        </div>
      )}

      {/* Description suggestion */}
      {suggestions.description && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">AI Description Suggestion:</p>
            <button onClick={() => onApply({ description: suggestions.description })}
              className="text-xs text-blue-400 hover:text-blue-300">Apply →</button>
          </div>
          <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">{suggestions.description}</pre>
        </div>
      )}

      {/* Specs suggestion */}
      {suggestions.specs && Object.keys(suggestions.specs).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-2">AI Extracted/Normalized Specs:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(suggestions.specs).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-400">{key}:</span>
                <span className="text-white">{value as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>AI uses the current PUBLISHED rulebook ({rulebook?.version || 'N/A'}) to generate compliant output.</p>
        <p>Title length validated against rulebook max. Description follows rulebook format/layout.</p>
        <p>Specs extracted from manufacturer/source URLs.</p>
      </div>
    </div>
  )
}