'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExportPage({ projectId, projectName, platform }: { projectId: string; projectName: string; platform: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportInfo, setExportInfo] = useState<{ count: number, downloadUrl: string } | null>(null)

  async function handleExport(format: string, filter: string) {
    setLoading(true)
    setError(null)
    setExportInfo(null)

    try {
      const res = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, format, filter })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); }
      else {
        setExportInfo({ count: data.count, downloadUrl: data.downloadUrl })
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const templates: Record<string, { label: string, description: string, columns: string[] }> = {
    ebay: {
      label: 'eBay Export',
      description: 'Title (M) + Description (N) format for eBay listings',
      columns: ['Brand', 'MPN', 'UPC', 'Type', 'Brand URL', 'Source URL', 'Title', 'Description']
    },
    amazon: {
      label: 'Amazon Export',
      description: '5 bullet points + description + specs for Amazon listings',
      columns: ['Brand', 'MPN', 'UPC', 'ASIN', 'Title', 'Bullet 1-5', 'Description', 'Specs', 'Category', 'Variation Theme']
    },
    gunbroker: {
      label: 'GunBroker Export',
      description: 'Title + description + payment/shipping terms for GunBroker',
      columns: ['Brand', 'Model', 'MPN', 'UPC', 'Caliber', 'Condition', 'Title', 'Description', 'Payment/Shipping']
    },
    nightgalaxy: {
      label: 'Night Galaxy Export',
      description: 'Full Magento column mapping (A-Y) for Night Galaxy product upload',
      columns: ['SKU', 'Price', 'Qty', 'Master_SKU', 'MPN', 'Parent_SKU', 'Var:Size', 'Var:Width', 'Product_type', 'Visible', 'Brand', 'Title', 'Description', 'Main_Image', 'Additional_Images', 'UPC', 'Weight', 'Color', 'Gender', 'Meta Title', 'Meta Keywords', 'Meta Description']
    }
  }

  const template = templates[platform] || templates.ebay

  const filters = [
    { value: 'all', label: 'All Products' },
    { value: 'qa_approved', label: 'QA Approved Only' },
    { value: 'researched', label: 'Researched (not yet QA)' },
    { value: 'pending', label: 'Pending Research' },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Export — {projectName}</h1>
        <p className="text-sm text-slate-400 mt-1">Export product data in platform-specific format</p>
      </div>

      {/* Template info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">{template.label}</h2>
        <p className="text-sm text-slate-400 mb-3">{template.description}</p>
        <div className="flex flex-wrap gap-2">
          {template.columns.map(col => (
            <span key={col} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">{col}</span>
          ))}
        </div>
      </div>

      {/* Filter selection */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Export Filter</h2>
        <div className="space-y-2">
          {filters.map(f => (
            <button key={f.value}
              onClick={() => handleExport('csv', f.value)}
              disabled={loading}
              className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors">
              <span className="text-white font-medium">{f.label}</span>
              <span className="text-xs text-slate-400 block mt-0.5">Export as CSV with {template.columns.length} columns</span>
            </button>
          ))}
        </div>
      </div>

      {/* Excel format */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Excel (.xlsx) Format</h2>
        <button onClick={() => handleExport('xlsx', 'all')} disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg">
          Export All as Excel
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Generating export…</p>}
      {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}

      {exportInfo && (
        <div className="bg-green-950/30 border border-green-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-green-400">Export Ready ✅</h3>
          <p className="text-sm text-slate-300">{exportInfo.count} products exported</p>
          <a href={exportInfo.downloadUrl} download
            className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
            ⬇ Download CSV
          </a>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">Export Notes:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>CSV exports use UTF-8 encoding with proper quoting</li>
          <li>Night Galaxy export includes all 25 Magento columns (A-Y)</li>
          <li>QA Approved filter = only products that passed quality review</li>
          <li>Each export is audit-logged</li>
        </ul>
      </div>
    </div>
  )
}