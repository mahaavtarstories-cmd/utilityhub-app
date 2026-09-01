'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Stage = 'discover' | 'generate' | 'full'

interface LogEntry {
  time: string
  item: string
  stage: string
  result: string
  failed: boolean
}

interface RefInfo {
  fileName: string | null
  chars: number
}

interface Stats {
  total: number
  pending: number
  urls: number
  generated: number
  failed: number
}

function labelOf(p: { brand?: string | null; mpn?: string | null; product_name?: string | null; id: string }) {
  return [p.brand, p.mpn].filter(Boolean).join(' ') || p.product_name || p.id.slice(0, 8)
}

export default function BatchRunner({
  projectId,
  projectName,
  platform,
}: {
  projectId: string
  projectName: string
  platform?: string
}) {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, urls: 0, generated: 0, failed: 0 })
  const [batchSize, setBatchSize] = useState(20)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 })
  const [log, setLog] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refInfo, setRefInfo] = useState<RefInfo | null>(null)
  const [refBusy, setRefBusy] = useState(false)
  const stopRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addLog = useCallback((item: string, stage: string, result: string, failed = false) => {
    setLog((prev) => [{ time: new Date().toLocaleTimeString(), item, stage, result, failed }, ...prev].slice(0, 100))
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const sb = createClient()
      const countWith = async (apply: (q: any) => any): Promise<number> => {
        let q = sb.from('products').select('id', { count: 'exact', head: true }).eq('project_id', projectId)
        q = apply(q)
        const { count } = await q
        return count || 0
      }
      const [total, urls, generated, failed] = await Promise.all([
        countWith((q) => q),
        countWith((q) => q.eq('research_status', 'urls_found')),
        countWith((q) => q.eq('research_status', 'content_generated')),
        countWith((q) => q.in('research_status', ['url_search_failed', 'generate_failed'])),
      ])
      setStats({ total, urls, generated, failed, pending: Math.max(0, total - urls - generated - failed) })
    } catch {
      // non-fatal — stats are advisory
    }
  }, [projectId])

  useEffect(() => {
    refreshStats()
    fetch(`/api/project-reference?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.chars > 0) setRefInfo({ fileName: d.fileName, chars: d.chars })
      })
      .catch(() => {})
  }, [refreshStats, projectId])

  async function handleReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRefBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('projectId', projectId)
      fd.append('file', file)
      const res = await fetch('/api/project-reference', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Reference upload failed')
      setRefInfo({ fileName: d.fileName, chars: d.chars })
      addLog('Master reference', 'upload', `stored: ${d.fileName} (${Number(d.chars).toLocaleString()} chars)`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRefBusy(false)
    }
  }

  async function removeReference() {
    setRefBusy(true)
    try {
      await fetch(`/api/project-reference?projectId=${projectId}`, { method: 'DELETE' })
      setRefInfo(null)
      addLog('Master reference', 'remove', 'removed')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRefBusy(false)
    }
  }

  async function runPipeline(stage: Stage) {
    if (running) return
    setRunning(true)
    setError(null)
    stopRef.current = false
    setProgress({ done: 0, total: 0, failed: 0 })
    try {
      const sb = createClient()
      const { data: products, error: qErr } = await sb
        .from('products')
        .select('id, brand, mpn, product_name, research_status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(5000)
      if (qErr) throw new Error(qErr.message)
      const all = (products || []) as Array<{ id: string; brand: string | null; mpn: string | null; product_name: string | null; research_status: string | null }>

      let targets = all
      if (stage === 'discover') {
        targets = all.filter((p) => p.research_status !== 'urls_found' && p.research_status !== 'content_generated')
      } else if (stage === 'generate') {
        targets = all.filter((p) => p.research_status === 'urls_found')
      } else {
        targets = all.filter((p) => p.research_status !== 'content_generated')
      }
      targets = targets.slice(0, batchSize)

      if (targets.length === 0) {
        addLog('—', stage, 'nothing to process for this stage')
        return
      }
      setProgress({ done: 0, total: targets.length, failed: 0 })

      for (const p of targets) {
        if (stopRef.current) {
          addLog(labelOf(p), stage, 'stopped by user')
          break
        }
        const label = labelOf(p)
        try {
          if (stage === 'discover' || stage === 'full') {
            const res = await fetch('/api/batch-discover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: p.id }),
            })
            const d = await res.json()
            if (!res.ok) throw new Error(d.error || 'discover failed')
            addLog(label, 'discover', `${d.confirmation} · ${d.verifiedCount ?? 0} verified`)
            if (d.status !== 'urls_found') {
              // No usable URLs — generation would be guesswork. Skip to next product.
              setProgress((pr) => ({ ...pr, done: pr.done + 1, failed: pr.failed + 1 }))
              continue
            }
          }
          if (stage === 'generate' || stage === 'full') {
            const res = await fetch('/api/batch-generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: p.id }),
            })
            const g = await res.json()
            if (!res.ok) throw new Error(g.error || 'generate failed')
            const over = g.withinLimit === false ? ' ⚠ OVER LIMIT' : ''
            const w = g.weight ? ` · ${g.weight}` : ''
            addLog(label, 'generate', `${g.titleLength} chars${over}${w}`, g.withinLimit === false)
          }
        } catch (err: any) {
          addLog(label, stage, `error: ${err.message}`, true)
          setProgress((pr) => ({ ...pr, done: pr.done + 1, failed: pr.failed + 1 }))
          continue
        }
        setProgress((pr) => ({ ...pr, done: pr.done + 1 }))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
      refreshStats()
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Batch Pipeline — {projectName}</h1>
        <p className="text-sm text-slate-400 mt-1">
          1) Find &amp; verify URLs (brand → supplier → competitor → other) → 2) Generate listing content
          (title, description, meta title/description/keywords, weight). Products run one-by-one for accuracy.
          {platform ? ` Platform: ${platform}.` : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Need URLs</p>
          <p className="text-xl font-bold text-amber-400">{stats.pending}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">URLs Found</p>
          <p className="text-xl font-bold text-blue-400">{stats.urls}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Generated</p>
          <p className="text-xl font-bold text-green-400">{stats.generated}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Failed</p>
          <p className="text-xl font-bold text-red-400">{stats.failed}</p>
        </div>
      </div>

      {/* Master reference file */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">📘 Master / Reference File (optional — helps the AI)</h3>
          {refInfo && (
            <span className="text-xs text-slate-400">
              {refInfo.fileName} · {refInfo.chars.toLocaleString()} chars
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Category master, brand spec sheets, price lists — anything the AI should treat as trusted context.
          Excel/CSV/TXT/MD/JSON. Stored per project and injected into every generation prompt.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt,.md,.json"
          onChange={handleReferenceUpload}
          className="hidden"
        />
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={refBusy}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {refBusy ? 'Working…' : refInfo ? 'Replace Reference File' : 'Upload Master File'}
          </button>
          {refInfo && refInfo.chars > 0 && (
            <button
              onClick={removeReference}
              disabled={refBusy}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Batch size</label>
            <input
              type="number"
              min={1}
              max={100}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 20)))}
              className="w-24 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <button
            onClick={() => runPipeline('discover')}
            disabled={running || stats.total === 0}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
          >
            1️⃣ Find &amp; Verify URLs ({stats.pending})
          </button>
          <button
            onClick={() => runPipeline('generate')}
            disabled={running || stats.urls === 0}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
          >
            2️⃣ Generate Content ({stats.urls} ready)
          </button>
          <button
            onClick={() => runPipeline('full')}
            disabled={running || stats.total === 0}
            className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
          >
            ▶ Run Full Pipeline
          </button>
          {running && (
            <button
              onClick={() => {
                stopRef.current = true
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
            >
              ■ Stop
            </button>
          )}
        </div>

        {/* Progress */}
        {(running || progress.total > 0) && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>
                {progress.done} / {progress.total} processed · {progress.failed} failed
              </span>
              <span>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Brand / MPN</th>
                <th className="px-4 py-2 text-left">Stage</th>
                <th className="px-4 py-2 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{l.time}</td>
                  <td className="px-3 py-1.5 text-slate-200 max-w-[220px] truncate">{l.item}</td>
                  <td className="px-3 py-1.5 text-slate-400">{l.stage}</td>
                  <td className={`px-3 py-1.5 ${l.failed ? 'text-red-400' : 'text-slate-300'}`}>{l.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>
      )}
    </div>
  )
}