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
  const sourceId = parts[parts.length - 2]

  const { error } = await supabase.from('approved_sources').delete().eq('id', sourceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'delete_source',
    entity_type: 'approved_sources',
    entity_id: sourceId
  })

  return NextResponse.redirect(new URL(`/app/projects/${projectId}/sources`, request.url))
}