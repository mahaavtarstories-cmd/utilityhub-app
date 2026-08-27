import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const parts = url.pathname.split('/')
  const projectId = parts[parts.length - 4]
  const rulebookId = parts[parts.length - 2]
  const formData = await request.formData()
  const action = formData.get('action') as string

  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  // Get current rulebook
  const { data: rulebook } = await supabase.from('rulebooks').select('*').eq('id', rulebookId).single()
  if (!rulebook) return NextResponse.json({ error: 'Rulebook not found' }, { status: 404 })

  let newStatus = rulebook.status
  let additionalUpdates: Record<string, any> = {}

  switch (action) {
    case 'submit_review':
      if (rulebook.status !== 'draft') return NextResponse.json({ error: 'Can only submit drafts for review' }, { status: 400 })
      newStatus = 'under_review'
      break

    case 'approve':
      if (rulebook.status !== 'under_review') return NextResponse.json({ error: 'Can only approve under_review rulebooks' }, { status: 400 })
      if (profile.role !== 'admin') return NextResponse.json({ error: 'Only admin can approve' }, { status: 403 })
      newStatus = 'approved'
      additionalUpdates = { approved_by: user.id }
      break

    case 'reject_review':
      if (rulebook.status !== 'under_review') return NextResponse.json({ error: 'Can only reject under_review rulebooks' }, { status: 400 })
      if (profile.role !== 'admin') return NextResponse.json({ error: 'Only admin can reject' }, { status: 403 })
      newStatus = 'draft'
      break

    case 'publish':
      if (rulebook.status !== 'approved') return NextResponse.json({ error: 'Can only publish approved rulebooks' }, { status: 400 })
      if (profile.role !== 'admin') return NextResponse.json({ error: 'Only admin can publish' }, { status: 403 })
      newStatus = 'published'
      additionalUpdates = { published_at: new Date().toISOString() }
      // Archive the previous published version
      await supabase.from('rulebooks')
        .update({ status: 'archived' })
        .eq('project_id', rulebook.project_id)
        .eq('status', 'published')
        .neq('id', rulebookId)
      break

    case 'archive':
      if (rulebook.status === 'published') return NextResponse.json({ error: 'Cannot archive published version' }, { status: 400 })
      newStatus = 'archived'
      break

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Update rulebook
  const { error } = await supabase.from('rulebooks').update({
    status: newStatus,
    ...additionalUpdates
  }).eq('id', rulebookId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to audit
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: `rulebook_${action}`,
    entity_type: 'rulebooks',
    entity_id: rulebookId,
    old_values: { status: rulebook.status },
    new_values: { status: newStatus, ...additionalUpdates }
  })

  // Redirect back to rulebook page
  return NextResponse.redirect(new URL(`/app/projects/${projectId}/rulebook`, request.url))
}