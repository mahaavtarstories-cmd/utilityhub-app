import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import BatchRunner from '@/components/batch-runner'

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  return <BatchRunner projectId={id} projectName={project.name} platform={project.platform} />
}