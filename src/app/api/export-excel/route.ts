import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLATFORM_LABELS } from '@/lib/types'

// CSV escape function
function csvEscape(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Build CSV from products based on platform
function buildCSV(products: any[], platform: string, projectName: string): string {
  let headers: string[] = []
  let rows: string[][] = []

  switch (platform) {
    case 'ebay':
      headers = ['Brand', 'MPN', 'UPC', 'Internal SKU', 'Product Name', 'Manufacturer URL', 'Product URL', 'Title', 'Description', 'Weight', 'Material', 'Color', 'Research Status', 'QA Status']
      rows = products.map(p => [
        p.brand, p.mpn, p.upc, p.internal_sku, p.product_name,
        p.manufacturer_url, p.product_url, p.product_name, p.description,
        p.weight, p.material, p.color, p.research_status, p.qa_status
      ])
      break

    case 'amazon':
      headers = ['Brand', 'MPN', 'UPC', 'Internal SKU', 'Product Name', 'Manufacturer URL', 'Product URL', 'Description', 'Weight', 'Material', 'Color', 'Research Status', 'QA Status']
      rows = products.map(p => [
        p.brand, p.mpn, p.upc, p.internal_sku, p.product_name,
        p.manufacturer_url, p.product_url, p.description,
        p.weight, p.material, p.color, p.research_status, p.qa_status
      ])
      break

    case 'gunbroker':
      headers = ['Brand', 'Model', 'MPN', 'UPC', 'Internal SKU', 'Product Name', 'Manufacturer URL', 'Product URL', 'Description', 'Weight', 'Material', 'Color', 'Research Status', 'QA Status']
      rows = products.map(p => [
        p.brand, p.model, p.mpn, p.upc, p.internal_sku, p.product_name,
        p.manufacturer_url, p.product_url, p.description,
        p.weight, p.material, p.color, p.research_status, p.qa_status
      ])
      break

    case 'nightgalaxy':
      headers = [
        'product_online', 'price', 'code', 'qty', 'product_websites',
        'Master_SKU', 'MPN', 'Parent_SKU', 'Var:Size', 'Var:Width',
        'Product_type', 'VISIBLE', 'Brand', 'Title', 'Description',
        'Main_Image', 'Additional_Images', 'UPC', 'Weight', 'Color',
        'Gender', 'Meta Title', 'Meta Keywords', 'Meta Description', 'QA Status'
      ]
      rows = products.map(p => {
        const specs = p.specifications || {}
        return [
          '1', '', p.internal_sku || '', '', '',
          '', p.mpn || '', '', specs.size || '', specs.width || '',
          'simple', 'Search', p.brand || '', p.product_name || '', p.description || '',
          '', '', p.upc || '', p.weight || '', p.color || '',
          specs.gender || '', '', '', '', p.qa_status || ''
        ]
      })
      break

    default:
      headers = ['Brand', 'MPN', 'UPC', 'Product Name', 'Description', 'Research Status', 'QA Status']
      rows = products.map(p => [p.brand, p.mpn, p.upc, p.product_name, p.description, p.research_status, p.qa_status])
  }

  const csvLines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    csvLines.push(row.map(csvEscape).join(','))
  }
  return csvLines.join('\n')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { projectId, format, filter } = await request.json()
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  // Get project info
  const { data: project } = await supabase.from('projects').select('name, platform').eq('id', projectId).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Build query based on filter
  let query = supabase.from('products').select('*').eq('project_id', projectId)
  switch (filter) {
    case 'qa_approved':
      query = query.eq('qa_status', 'approved')
      break
    case 'researched':
      query = query.not('research_status', 'eq', 'pending')
      break
    case 'pending':
      query = query.eq('research_status', 'pending')
      break
    default:
      // all
  }

  const { data: products, error } = await query.order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!products || products.length === 0) {
    return NextResponse.json({ error: 'No products found for this filter' }, { status: 400 })
  }

  // Build CSV
  const csv = buildCSV(products, project.platform, project.name)
  const fileName = `${project.name}_${filter}_${new Date().toISOString().split('T')[0]}.csv`

  // Log to audit
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'export_products',
    entity_type: 'products',
    new_values: { projectId, filter, count: products.length, fileName }
  })

  // Return CSV as downloadable response
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    }
  })
}