'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewTaskPage({ projectId, projectName, employees }: { projectId: string; projectName: string; employees: {id: string, email: string, full_name: string | null, role: string}[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [qaAssignedTo, setQaAssignedTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').insert({
      project_id: projectId,
      title,
      description: description || null,
      status: assignedTo ? 'assigned' : 'new',
      assigned_to: assignedTo || null,
      qa_assigned_to: qaAssignedTo || null,
      assigned_by: null
    })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/app/tasks'); router.refresh() }
  }

  const researchers = employees.filter(e => ['researcher', 'manager', 'admin'].includes(e.role))
  const qaStaff = employees.filter(e => ['qa', 'manager', 'admin'].includes(e.role))

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Task — {projectName}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Task Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Research: Brand Product MPN" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Assign To (Researcher)</label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Unassigned —</option>
            {researchers.map(e => (
              <option key={e.id} value={e.id}>{e.full_name || e.email} ({e.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">QA Assign To</label>
          <select value={qaAssignedTo} onChange={e => setQaAssignedTo(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Unassigned —</option>
            {qaStaff.map(e => (
              <option key={e.id} value={e.id}>{e.full_name || e.email} ({e.role})</option>
            ))}
          </select>
        </div>
        {error && <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</div>}
        <button type="submit" disabled={loading}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
          {loading ? 'Creating…' : 'Create Task'}
        </button>
      </form>
    </div>
  )
}