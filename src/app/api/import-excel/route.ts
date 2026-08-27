import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Simple CSV parser
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += char
    } else {
      if (char === '"') inQuotes = true
      else if (char === ',') { current.push(field); field = '' }
      else if (char === '\n') { current.push(field); rows.push(current); current = []; field = '' }
      else if (char === '\r') { /* skip */ }
      else field += char
    }
  }
  if (field || current.length) { current.push(field); rows.push(current) }
  return rows.filter(r => r.length > 0)
}

// Normalize header names
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { projectId, csvData } = await request.json()
  if (!projectId || !csvData) return NextResponse.json({ error: 'Missing projectId or csvData' }, { status: 400 })

  const rows = parseCSV(csvData)
  if (rows.length < 2) return NextResponse.json({ error: 'File must have header + at least 1 data row' }, { status: 400 })

  const headers = rows[0].map(normalizeHeader)
  const dataRows = rows.slice(1)

  // Map headers to product fields
  const headerMap: Record<string, string> = {
    brand: 'brand', mpn: 'mpn', upc: 'upc', sku: 'internal_sku',
    product_name: 'product_name', productname: 'product_name', name: 'product_name',
    manufacturer: 'manufacturer', model: 'model',
    manufacturer_url: 'manufacturer_url', manufacturerurl: 'manufacturer_url',
    product_url: 'product_url', producturl: 'product_url',
    description: 'description', weight: 'weight', material: 'material', color: 'color'
  }

  let imported = 0
  let duplicates = 0
  let errors = 0
  const errorDetails: string[] = []

  // Check existing MPNs/UPCs for duplicate detection
  const { data: existing } = await supabase
    .from('products')
    .select('mpn, upc')
    .eq('project_id', projectId)

  const existingMPNs = new Set((existing || []).map((p: any) => p.mpn).filter(Boolean))
  const existingUPCs = new Set((existing || []).map((p: any) => p.upc).filter(Boolean))

  const productsToInsert: any[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const product: Record<string, any> = { project_id: projectId, research_status: 'pending', qa_status: 'pending' }

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      const fieldName = headerMap[header]
      if (fieldName && row[j]) {
        product[fieldName] = row[j].trim()
      }
    }

    // Validate required fields
    if (!product.brand && !product.mpn && !product.upc) {
      errors++
      errorDetails.push(`Row ${i + 2}: No Brand, MPN, or UPC — skipped`)
      continue
    }

    // Check duplicates
    if (product.mpn && existingMPNs.has(product.mpn)) {
      duplicates++
      continue
    }
    if (product.upc && existingUPCs.has(product.upc)) {
      duplicates++
      continue
    }

    // Track for batch duplicate check
    if (product.mpn) existingMPNs.add(product.mpn)
    if (product.upc) existingUPCs.add(product.upc)

    productsToInsert.push(product)
  }

  // Batch insert
  if (productsToInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select('id')

    if (error) {
      errorDetails.push(`Batch insert error: ${error.message}`)
      errors += productsToInsert.length
    } else {
      imported = inserted?.length || 0

      // Auto-create tasks for each imported product
      if (imported > 0 && inserted) {
        const tasks = inserted.map((p: any, idx: number) => ({
          project_id: projectId,
          product_id: p.id,
          title: `Research: ${productsToInsert[idx].brand || ''} ${productsToInsert[idx].product_name || productsToInsert[idx].mpn || ''}`.trim(),
          status: 'new' as const
        }))
        await supabase.from('tasks').insert(tasks)

        // Log to audit
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'excel_import',
          entity_type: 'products',
          new_values: { projectId, imported, duplicates, errors, fileName: 'upload' }
        })
      }
    }
  }

  return NextResponse.json({ imported, duplicates, errors, errorDetails })
}