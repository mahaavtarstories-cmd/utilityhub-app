import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import WorkScreen from '@/components/work-screen'

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (!task) notFound()

  const { data: product } = task.product_id
    ? await supabase.from('products').select('*').eq('id', task.product_id).single()
    : { data: null }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', task.project_id)
    .single()

  // Get published rulebook for this project
  const { data: rulebook } = await supabase
    .from('rulebooks')
    .select('*')
    .eq('project_id', task.project_id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <WorkScreen
      taskId={id}
      task={task}
      product={product}
      project={project}
      rulebook={rulebook}
      userRole={user.role}
      userId={user.id}
    />
  )
}