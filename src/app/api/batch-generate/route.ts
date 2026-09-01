import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'

// Night Galaxy pipeline — STEP 3: content generation for ONE product.
// ONE AI call (think:false, JSON output) produces: title (<= platform limit),
// meta_title, meta_description, meta_keywords, description, weight.
// Context: global rules + published rulebook (incl. master/reference file) + discovered page data.

export const maxDuration = 60

const PLATFORM_TITLE_MAX: Record<string, number> = {
  nightgalaxy: 120,
  ebay: 80,
  gunbroker: 80,
  amazon: 200,
}

const LISTING_RULES = `LISTING RULES:
- Title: max {TITLE_MAX} chars. Format: [Brand] [Real Product Name/Type] [Key Specs] [Size if variation] - [MPN]. MPN appears exactly once at the end after " - ". Full size words only (Extra Large not XL, Regular/Wide not R/W). No commas, no parentheses, no (r) or (tm) symbols.
- Description layout (plain text, NO HTML, no ## markdown prefixes):
  Line 1 = short H2-style heading with key attribute (e.g. "... 8-Inch ...") — no MPN at the end
  Then: intro paragraph (2-4 sentences, real product info only)
  Then line: "Key Features:" followed by 5-9 lines starting with "- " (real features from sources)
  Then line: "Additional Info:" followed by "- Label: Value" lines (Product Type, MPN, UPC, Weight, Material, Color, Size, certifications found in sources)
  Then line: "Country Of Origin: <country>" (only if found in sources)
- Meta Title: max 70 chars, SEO-friendly
- Meta Description: 140-160 chars, compelling, no quotes
- Meta Keywords: 8-15 comma-separated SEO terms (brand, product type, key specs, use-case)
- Weight: only if found in sources/specs (with unit, e.g. "3.2 lb" or "24 oz"); otherwise empty string
- Never invent specifications. Use only data from the sources and product data below.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager', 'researcher', 'qa'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { productId } = await request.json()
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single()
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const { data: project } = await supabase.from('projects').select('platform').eq('id', product.project_id).single()
  const platform = (project as any)?.platform || 'nightgalaxy'

  // ---- Title max: global rules override, else platform default
  const { data: globalRules } = await supabase.from('global_rules').select('key, label, value, type').order('category')
  let titleMax = PLATFORM_TITLE_MAX[platform] || 120
  for (const r of (globalRules || []) as any[]) {
    if (r.key === `title_max_length_${platform}` && parseInt(r.value, 10) > 0) titleMax = parseInt(r.value, 10)
    else if (r.key === 'title_max_length' && !PLATFORM_TITLE_MAX[platform] && parseInt(r.value, 10) > 0) titleMax = parseInt(r.value, 10)
  }

  // ---- Published rulebook + master reference file
  const { data: rulebook } = await supabase
    .from('rulebooks')
    .select('version, title_rules, description_rules, custom_rules')
    .eq('project_id', product.project_id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const rulebookLines: string[] = []
  if (rulebook) {
    if (rulebook.title_rules) rulebookLines.push(`[TITLE RULES] ${JSON.stringify(rulebook.title_rules)}`)
    if (rulebook.description_rules) rulebookLines.push(`[DESCRIPTION RULES] ${JSON.stringify(rulebook.description_rules)}`)
    const custom: any = rulebook.custom_rules || {}
    if (custom.master_context) rulebookLines.push(`[MASTER/REFERENCE FILE DATA — trusted, use first]\n${String(custom.master_context).slice(0, 12000)}`)
  }
  const rulebookText = rulebookLines.length ? `PROJECT RULEBOOK:\n${rulebookLines.join('\n')}\n` : ''

  // ---- Discovered page data from step 2
  const sourceInfo: any = product.source_info || {}
  const pageData: Record<string, any> = sourceInfo.page_data || {}
  const pageContext = Object.entries(pageData)
    .map(([type, pd]: [string, any]) =>
      `--- ${type.toUpperCase()} SOURCE (${sourceInfo.urls?.[type]?.url || 'n/a'}) ---\n` +
      `Page Title: ${pd?.title || ''}\n` +
      (pd?.h1 ? `Heading: ${pd.h1}\n` : '') +
      (pd?.meta_desc ? `Meta: ${pd.meta_desc}\n` : '') +
      `Content: ${pd?.text || ''}`
    )
    .join('\n\n')
    .slice(0, 15000)

  const spec: any = product.specifications || {}
  const specsJson = JSON.stringify(spec)

  const prompt = `You are a product listing generator for Night Galaxy e-commerce. Generate a complete, compliant listing using ONLY real data from the sources below.

${LISTING_RULES.replace('{TITLE_MAX}', String(titleMax))}

${rulebookText}
PRODUCT DATA:
Brand: ${product.brand || 'N/A'}
MPN: ${product.mpn || 'N/A'}
UPC: ${product.upc || 'N/A'}
SKU: ${product.internal_sku || 'N/A'}
Source Product Name: ${product.product_name || 'N/A'}
Existing Weight: ${product.weight || 'not provided'}
Color: ${product.color || 'not specified'}
Material: ${product.material || 'not specified'}
Specifications JSON: ${JSON.stringify(spec)}

DISCOVERED SOURCE PAGES (verified same product):
${pageContext || '(none available — rely strictly on product data above; do not invent specs)'}

OUTPUT: Return ONLY a valid JSON object (no markdown fences) with exactly these keys:
{"title": "...", "meta_title": "...", "meta_description": "...", "meta_keywords": "...", "description": "...", "weight": ""}

- title: max ${titleMax} chars
- description: Night Galaxy layout per rules (plain text, no HTML)
- weight: with unit (e.g. "3.2 lb" or "24 oz") if found anywhere in sources/specs, else ""
JSON now:`

  try {
    const rawAI = await callAI(prompt, { numPredict: 2048 })
    const parsed = extractJSON(rawAI)
    if (!parsed || !parsed.title) {
      return NextResponse.json({ error: 'AI returned unparseable output', raw: String(rawAI).slice(0, 200) }, { status: 502 })
    }

    const title = String(parsed.title).replace(/^["']|["']$/g, '').trim()
    const withinLimit = title.length <= titleMax

    const newSpecs: any = { ...spec }
    newSpecs.ng_title = title
    if (parsed.meta_title) newSpecs.meta_title = String(parsed.meta_title).trim()
    if (parsed.meta_description) newSpecs.meta_description = String(parsed.meta_description).trim()
    if (parsed.meta_keywords) newSpecs.meta_keywords = String(parsed.meta_keywords).trim()
    if (!withinLimit) newSpecs.content_warning = `title ${title.length} chars exceeds ${titleMax} limit`

    const update: any = {
      specifications: newSpecs,
      research_status: 'content_generated',
    }
    if (parsed.description) update.description = String(parsed.description).replace(/^##\s*/gm, '').replace(/<\/?[a-z][^>]*>/gi, '').trim()
    if (parsed.weight) update.weight = String(parsed.weight).trim()

    const { error } = await supabase.from('products').update(update).eq('id', productId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'batch_generate',
      entity_type: 'products',
      entity_id: productId,
      new_values: { titleLength: title.length, withinLimit },
    })

    return NextResponse.json({
      ok: true,
      productId,
      title,
      titleLength: title.length,
      withinLimit,
      meta_title: parsed.meta_title || '',
      meta_description: parsed.meta_description || '',
      meta_keywords: parsed.meta_keywords || '',
      weight: parsed.weight || '',
      description_chars: parsed.description ? String(parsed.description).length : 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Generation failed: ${err.message}` }, { status: 500 })
  }
}

function extractJSON(raw: string): any | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}