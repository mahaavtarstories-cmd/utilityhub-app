import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ExportPage from '@/components/export-page'

export default async function ProjectExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name, platform').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="space-y-6">
      <Link href={`/app/projects/${id}`} className="text-sm text-slate-400 hover:text-white">← {project.name}</Link>
      <ExportPage projectId={project.id} projectName={project.name} platform={project.platform} />
    </div>
  )
}