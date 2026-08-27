import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RulebookEditor from '../rulebook-editor'

export default async function NewRulebookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params
  const { from } = await searchParams
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  if (!project) notFound()

  let fromRulebook = null
  if (from) {
    const { data } = await supabase.from('rulebooks').select('*').eq('id', from).single()
    fromRulebook = data
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/projects/${id}/rulebook`} className="text-sm text-slate-400 hover:text-white">← Rulebook</Link>
        <h1 className="text-2xl font-bold text-white mt-2">New Rulebook Version — {project.name}</h1>
      </div>
      <RulebookEditor projectId={id} fromRulebook={fromRulebook} />
    </div>
  )
}