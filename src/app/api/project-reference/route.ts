import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Master/reference file per project — stored in the project's published rulebook
// under custom_rules.master_context (no DDL needed). Injected into batch-generation prompts.

export const maxDuration = 60

const MAX_CHARS = 60000

async function fileToText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(buffer, { type: 'array' })
    const parts: string[] = []
    const textParts: string[] = []
    for (const sheetName of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) as any[][]
      const lines = rows.map((r) => r.map((c) => String(c ?? '').trim()).filter(Boolean).join(' | ')).filter(Boolean)
      let sheetText = lines.join('\n')
      if (sheetText.length > 30000) sheetText = sheetText.slice(0, 30000) + '\n...(truncated)'
      textParts.push(`[Sheet: ${sheetName}]`)
      textParts.push(sheetText)
    }
    return textParts.join('\n\n')
  }
  return new TextDecoder().decode(buffer).slice(0, 60000)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') || ''
  let projectId = ''
  let fileName = 'pasted-reference'
  let refText = ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    projectId = String(formData.get('projectId') || '')
    const file = formData.get('file') as File | null
    const pasted = formData.get('text') as string | null
    if (file) {
      fileName = file.name
      refText = await fileToText(file)
    } else if (pasted) {
      refText = pasted
    }
  } else {
    const body = await request.json()
    projectId = body.projectId
    refText = body.text || ''
  }

  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  if (!refText || !refText.trim()) return NextResponse.json({ error: 'No reference text provided' }, { status: 400 })
  refText = refText.slice(0, MAX_CHARS)

  // Target rulebook: published first, else latest draft, else create one
  const { data: rulebooks } = await supabase
    .from('rulebooks')
    .select('id, version, status, custom_rules')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  let target = (rulebooks || []).find((r: any) => r.status === 'published') || (rulebooks || [])[0]
  if (!target) {
    const { data: created, error: createErr } = await supabase
      .from('rulebooks')
      .insert({
        project_id: projectId,
        version: '0.1',
        status: 'draft',
        custom_rules: { master_context: refText, master_file_name: fileName },
      })
      .select('id')
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, stored: true, mode: 'created_rulebook', fileName, chars: refText.length })
  }

  const custom: any = { ...(target.custom_rules || {}) }
  custom.master_context = refText
  custom.master_file_name = fileName
  const { error } = await supabase.from('rulebooks').update({ custom_rules: custom }).eq('id', target.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'reference_upload',
    entity_type: 'rulebooks',
    entity_id: target.id,
    new_values: { fileName, chars: refText.length },
  })

  return NextResponse.json({ ok: true, stored: true, mode: 'updated_rulebook', fileName, chars: refText.length })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data: rulebooks } = await supabase
    .from('rulebooks')
    .select('custom_rules, status')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(5)

  const target = (rulebooks || []).find((r: any) => r.status === 'published') || (rulebooks || [])[0]
  const custom: any = (target as any)?.custom_rules || {}
  return NextResponse.json({
    fileName: custom.master_file_name || null,
    chars: custom.master_context ? String(custom.master_context).length : 0,
    preview: String(custom.master_context || '').slice(0, 300),
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data: rulebook } = await supabase
    .from('rulebooks')
    .select('id, custom_rules')
    .eq('project_id', projectId)
    .eq('status', 'published')
    .limit(1)
    .single()
  if (!rulebook) return NextResponse.json({ ok: true, removed: false })

  const custom: any = { ...((rulebook as any).custom_rules || {}) }
  delete custom.master_context
  delete custom.master_file_name
  await supabase.from('rulebooks').update({ custom_rules: custom }).eq('id', (rulebook as any).id)
  return NextResponse.json({ ok: true, removed: true })
}