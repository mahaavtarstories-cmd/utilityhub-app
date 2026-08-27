import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { taskId, action, comment, updates } = body

  if (!taskId || !action) return NextResponse.json({ error: 'Missing taskId or action' }, { status: 400 })

  // Get task
  const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single()
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Get user profile
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let newStatus = task.status
  let additionalUpdates: Record<string, any> = {}

  switch (action) {
    case 'start':
      if (task.assigned_to !== user.id && !['admin', 'manager'].includes(profile.role)) {
        return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 })
      }
      newStatus = 'in_progress'
      break

    case 'submit':
      if (task.assigned_to !== user.id && !['admin', 'manager'].includes(profile.role)) {
        return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 })
      }
      newStatus = 'qa_pending'
      additionalUpdates = { submitted_at: new Date().toISOString() }
      // Update product research status
      if (task.product_id && updates) {
        await supabase.from('products').update({
          ...updates,
          research_status: 'submitted',
          updated_by: user.id
        }).eq('id', task.product_id)
      }
      break

    case 'approve':
      if (!['admin', 'manager', 'qa'].includes(profile.role)) {
        return NextResponse.json({ error: 'Not QA staff' }, { status: 403 })
      }
      newStatus = 'approved'
      additionalUpdates = { completed_at: new Date().toISOString() }
      if (task.product_id) {
        await supabase.from('products').update({ qa_status: 'approved' }).eq('id', task.product_id)
      }
      break

    case 'reject':
      if (!['admin', 'manager', 'qa'].includes(profile.role)) {
        return NextResponse.json({ error: 'Not QA staff' }, { status: 403 })
      }
      if (!comment) return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
      newStatus = 'rejected'
      additionalUpdates = { qa_comment: comment }
      if (task.product_id) {
        await supabase.from('products').update({ qa_status: 'rejected' }).eq('id', task.product_id)
      }
      break

    case 'complete':
      if (!['admin', 'manager'].includes(profile.role)) {
        return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
      }
      newStatus = 'completed'
      break

    case 'assign':
      if (!['admin', 'manager'].includes(profile.role)) {
        return NextResponse.json({ error: 'Manager+ only' }, { status: 403 })
      }
      additionalUpdates = { assigned_to: updates?.assigned_to, status: 'assigned' }
      newStatus = 'assigned'
      break

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Update task
  const { error } = await supabase.from('tasks').update({
    status: newStatus,
    ...additionalUpdates
  }).eq('id', taskId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to audit
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: `task_${action}`,
    entity_type: 'tasks',
    entity_id: taskId,
    new_values: { status: newStatus, ...additionalUpdates }
  })

  return NextResponse.json({ success: true, status: newStatus })
}