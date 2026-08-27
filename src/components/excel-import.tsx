'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ExcelImportPage({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const res = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Import failed') }
      else { setResult(data) }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Import Excel — {projectName}</h1>
        <p className="text-sm text-slate-400 mt-1">Upload a CSV or Excel (.xlsx) file with product data. Required: Brand, MPN, or UPC. Optional: SKU, Product Name, URLs, Description, Weight, Material, Color.</p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
            Choose File
          </button>
          {file && <p className="mt-3 text-sm text-slate-300">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          {!file && <p className="mt-3 text-sm text-slate-500">No file selected — supports .csv, .xlsx, .xls</p>}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-2">Supported formats & columns:</p>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">CSV: Brand,MPN,UPC,SKU,ProductName,ManufacturerURL,ProductURL,Description,Weight,Material,Color</p>
            <p className="text-xs text-slate-500">Excel: Same columns as header row, first sheet only</p>
            <p className="text-xs text-slate-500">Night Galaxy: Uses code/title/mpn/upc columns from Magento export</p>
          </div>
        </div>

        {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}

        {result && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">Import Report</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-950/30 border border-green-800 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-400">{result.imported}</p>
                <p className="text-xs text-slate-400">Imported</p>
              </div>
              <div className="bg-yellow-950/30 border border-yellow-800 rounded-lg p-3">
                <p className="text-2xl font-bold text-yellow-400">{result.duplicates}</p>
                <p className="text-xs text-slate-400">Duplicates</p>
              </div>
              <div className="bg-red-950/30 border border-red-800 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-400">{result.errors}</p>
                <p className="text-xs text-slate-400">Errors</p>
              </div>
            </div>
            {result.errorDetails && result.errorDetails.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto">
                <p className="text-xs text-slate-400 mb-1">Error details (first 15):</p>
                {result.errorDetails.map((err: string, i: number) => (
                  <p key={i} className="text-xs text-red-400">• {err}</p>
                ))}
              </div>
            )}
            {result.imported > 0 && (
              <button onClick={() => router.push(`/app/projects/${projectId}`)}
                className="text-sm text-blue-400 hover:text-blue-300">View project →</button>
            )}
          </div>
        )}

        <button type="submit" disabled={!file || loading}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
          {loading ? 'Importing…' : 'Import File'}
        </button>
      </form>
    </div>
  )
}