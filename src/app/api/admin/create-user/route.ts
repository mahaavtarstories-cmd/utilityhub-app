import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, fullName, role } = await request.json()

  // Use service role to create user
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update profile with name and role
  await adminClient.from('profiles')
    .update({ full_name: fullName, role })
    .eq('id', data.user.id)

  // Log to audit
  await adminClient.from('audit_log').insert({
    user_id: user.id,
    action: 'create_user',
    entity_type: 'profiles',
    entity_id: data.user.id,
    new_values: { email, full_name: fullName, role },
  })

  return NextResponse.json({ success: true, userId: data.user.id })
}