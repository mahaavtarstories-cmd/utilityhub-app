import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Parse CSV text
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

// Parse uploaded file — handles both CSV and XLSX
async function parseFile(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
    return data.filter(r => r.length > 0)
  } else {
    // Parse CSV
    const text = new TextDecoder().decode(buffer)
    return parseCSV(text)
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Handle multipart form data (file upload)
  const contentType = request.headers.get('content-type') || ''
  
  let file: File | null = null
  let projectId: string = ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    file = formData.get('file') as File
    projectId = formData.get('projectId') as string
  } else {
    // Legacy JSON format (CSV text only)
    const body = await request.json()
    projectId = body.projectId
    const csvData = body.csvData
    if (csvData) {
      file = new File([csvData], 'upload.csv', { type: 'text/csv' })
    }
  }

  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  try {
    const rows = await parseFile(file)
    if (rows.length < 2) return NextResponse.json({ error: 'File must have header + at least 1 data row' }, { status: 400 })

    const headers = rows[0].map(normalizeHeader)
    const dataRows = rows.slice(1)

    // Map headers to product fields — supports CSV, Excel, and Night Galaxy Magento export columns
    const headerMap: Record<string, string> = {
      brand: 'brand', mpn: 'mpn', upc: 'upc', sku: 'internal_sku',
      product_name: 'product_name', productname: 'product_name', name: 'product_name',
      manufacturer: 'manufacturer', model: 'model',
      manufacturer_url: 'manufacturer_url', manufacturerurl: 'manufacturer_url',
      product_url: 'product_url', producturl: 'product_url',
      description: 'description', weight: 'weight', material: 'material', color: 'color',
      // Night Galaxy Magento export columns
      code: 'internal_sku', title: 'product_name', master_sku: 'internal_sku',
      parent_sku: 'parent_sku', variation_size: 'variation_size',
      variation_shoe_width: 'variation_width', variation_width: 'variation_width',
      product_type: 'product_type', main_image: 'main_image',
      additional_images: 'additional_images', cat_ng_lg: 'cat_ng_lg',
      gender: 'gender', meta_title: 'meta_title', meta_description: 'meta_description',
      meta_keywords: 'meta_keywords',
    }

    // Store NG-specific fields in product.specifications JSONB
    const ngSpecFields = ['parent_sku', 'variation_size', 'variation_width', 'product_type', 'main_image', 'additional_images', 'cat_ng_lg', 'gender', 'meta_title', 'meta_description', 'meta_keywords']

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
      const specs: Record<string, any> = {}

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        const fieldName = headerMap[header]
        const cellValue = row[j] !== undefined && row[j] !== null ? String(row[j]).trim() : ''
        
        if (fieldName && cellValue) {
          if (ngSpecFields.includes(fieldName)) {
            specs[fieldName] = cellValue
          } else {
            product[fieldName] = cellValue
          }
        }
      }

      // Store NG-specific fields in specifications JSONB
      if (Object.keys(specs).length > 0) {
        product.specifications = specs
      }

      // Validate required fields
      if (!product.brand && !product.mpn && !product.upc) {
        errors++
        if (errorDetails.length < 15) {
          errorDetails.push(`Row ${i + 2}: No Brand, MPN, or UPC — skipped`)
        }
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

    // Batch insert (max 500 at a time)
    while (productsToInsert.length > 0) {
      const batch = productsToInsert.splice(0, 500)
      const { data: inserted, error } = await supabase
        .from('products')
        .insert(batch)
        .select('id')

      if (error) {
        errorDetails.push(`Batch insert error: ${error.message}`)
        errors += batch.length
      } else {
        imported += inserted?.length || 0

        // Auto-create tasks for each imported product
        if (inserted && inserted.length > 0) {
          const tasks = inserted.map((p: any, idx: number) => {
            const batchItem = batch[idx]
            return {
              project_id: projectId,
              product_id: p.id,
              title: `Research: ${batchItem.product_name || batchItem.brand || batchItem.mpn || 'Unknown Product'}`.trim(),
              status: 'new' as const
            }
          })
          await supabase.from('tasks').insert(tasks)
        }
      }
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'excel_import',
      entity_type: 'products',
      new_values: { projectId, imported, duplicates, errors, fileName: file.name }
    })

    return NextResponse.json({ imported, duplicates, errors, errorDetails })
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to parse file: ${err.message}` }, { status: 500 })
  }
}