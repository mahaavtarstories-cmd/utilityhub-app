import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TaskForm from '@/components/task-form'

export default async function NewTaskPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
  const { data: employees } = await supabase.from('profiles').select('id, email, full_name, role').eq('is_active', true)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/app/tasks" className="text-sm text-slate-400 hover:text-white">← Tasks</Link>
        <h1 className="text-2xl font-bold text-white mt-2">New Task</h1>
      </div>
      <TaskForm
        projectId={projects?.[0]?.id || ''}
        projectName={projects?.[0]?.name || ''}
        employees={employees || []}
      />
    </div>
  )
}