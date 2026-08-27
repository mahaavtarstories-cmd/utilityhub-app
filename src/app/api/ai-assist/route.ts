import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// AI Provider abstraction — can swap providers by changing env vars
// Current: Ollama cloud (same as main session)
// Future: OpenAI, Anthropic, etc.

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const aiUrl = process.env.AI_PROVIDER_URL || 'http://localhost:11434/api/generate'
  const aiModel = process.env.AI_MODEL || 'qwen3.5:cloud'
  const aiKey = process.env.AI_API_KEY

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (aiKey) headers['X-API-Key'] = aiKey

    const res = await fetch(aiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiModel,
        prompt: `${systemPrompt}\n\n${prompt}`,
        stream: false
      })
    })
    if (!res.ok) throw new Error(`AI provider error: ${res.status}`)
    const data = await res.json()
    return data.response || data.output || ''
  } catch (err: any) {
    throw new Error(`AI provider unavailable: ${err.message}`)
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager', 'researcher', 'qa'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action, productId, projectId, ruleContext, productData } = await request.json()

  // Get product if not provided inline
  let product = productData
  if (productId && !product) {
    const { data } = await supabase.from('products').select('*').eq('id', productId).single()
    product = data
  }

  if (!product) return NextResponse.json({ error: 'No product data' }, { status: 400 })

  // Fetch global rules to append to rule context
  const { data: globalRules } = await supabase.from('global_rules').select('key, label, value, type').order('category')
  let globalContext = ''
  
  // Build rules context for AI
  if (globalRules && globalRules.length > 0) {
    // Get project platform for per-platform max length
    const { data: project } = await supabase.from('projects').select('platform').eq('id', projectId).single()
    const platform = project?.platform || 'ebay'
    
    // Find platform-specific max length
    const platformMaxLen = globalRules.find(r => r.key === `title_max_length_${platform}`)
    const defaultMaxLen = globalRules.find(r => r.key === 'title_max_length')
    const titleMaxLen = platformMaxLen?.value || defaultMaxLen?.value || '80'
    
    globalContext = '\n\nGLOBAL RULES (apply to all platforms):\n'
    globalContext += `Platform: ${platform}\n`
    globalContext += `Max Title Length for this platform: ${titleMaxLen} chars\n`
    
    for (const r of globalRules) {
      // Skip per-platform max length rules (already included above)
      if (r.key.startsWith('title_max_length_') && r.key !== 'title_max_length') continue
      
      if (r.type === 'checkbox' && r.value === 'true') {
        globalContext += `- ${r.label}: YES\n`
      } else if (r.type === 'checkbox' && r.value === 'false') {
        globalContext += `- ${r.label}: NO\n`
      } else if (r.value && r.key !== 'title_max_length') {
        globalContext += `- ${r.label}: ${r.value}\n`
      }
    }
    
    // Add space-aware instruction
    globalContext += `\nIMPORTANT: Include Color, Size, Material, and SEO words ONLY if there is space remaining within the ${titleMaxLen} char limit.\n`
    globalContext += `Priority order (include in this order until limit reached): Brand, Product Type, Key Spec, MPN, Color, Size, Material, SEO Words\n`
    globalContext += `Current platform max length: ${titleMaxLen} chars\n`
  }

  const fullRuleContext = (ruleContext || '') + globalContext

  // Log AI usage
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: `ai_${action}`,
    entity_type: 'products',
    entity_id: productId,
    new_values: { action, productId }
  })

  const systemPrompt = `You are a product listing assistant for an e-commerce team. Generate accurate, professional product content following the project rulebook exactly. Never invent specifications — only use provided data. Output plain text, no HTML.`

  try {
    switch (action) {
      case 'generate_title': {
        const prompt = `${fullRuleContext}

Generate a product title for:
Brand: ${product.brand || 'N/A'}
MPN: ${product.mpn || 'N/A'}
UPC: ${product.upc || 'N/A'}
Product: ${product.product_name || 'N/A'}

Follow the title rules EXACTLY. Output ONLY the title, nothing else.`

        const title = await callAI(prompt, systemPrompt)
        return NextResponse.json({ title: title.trim() })
      }

      case 'generate_description': {
        const prompt = `${fullRuleContext}

Generate a product description for:
Brand: ${product.brand || 'N/A'}
MPN: ${product.mpn || 'N/A'}
UPC: ${product.upc || 'N/A'}
Product: ${product.product_name || 'N/A'}
Manufacturer URL: ${product.manufacturer_url || 'N/A'}
Product URL: ${product.product_url || 'N/A'}

Follow the description rules EXACTLY. Use the specified layout and sections. Include all available data. Output ONLY the description, nothing else.`

        const description = await callAI(prompt, systemPrompt)
        return NextResponse.json({ description: description.trim() })
      }

      case 'extract_specs': {
        const prompt = `Extract all product specifications from the following product data. Output as key: value pairs, one per line.

Product: ${product.product_name || 'N/A'}
Brand: ${product.brand || 'N/A'}
MPN: ${product.mpn || 'N/A'}
Description: ${product.description || 'N/A'}

Extract: weight, dimensions, material, color, size, capacity, compatibility, and any other specs mentioned. Format: Key: Value (one per line).`

        const result = await callAI(prompt, systemPrompt)
        // Parse key: value lines
        const specs: Record<string, string> = {}
        result.split('\n').forEach((line: string) => {
          const match = line.match(/^([^:]+):\s*(.+)$/)
          if (match) specs[match[1].trim()] = match[2].trim()
        })
        return NextResponse.json({ specs })
      }

      case 'normalize': {
        const prompt = `Normalize the following product data values to standard formats. Output as key: value pairs.

Weight: ${product.weight || 'N/A'}
Material: ${product.material || 'N/A'}
Color: ${product.color || 'N/A'}

Rules:
- Weight: convert to "X oz" or "X lb" format (e.g., "4oz" → "4 oz", "1.5 pounds" → "24 oz")
- Material: capitalize properly (e.g., "stainless steel" → "Stainless Steel")
- Color: capitalize properly (e.g., "black" → "Black", "OD green" → "OD Green")
- Remove extra spaces, normalize units`

        const result = await callAI(prompt, systemPrompt)
        const normalized: Record<string, string> = {}
        result.split('\n').forEach((line: string) => {
          const match = line.match(/^([^:]+):\s*(.+)$/)
          if (match) normalized[match[1].trim()] = match[2].trim()
        })
        return NextResponse.json({ normalized })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    // If AI provider is unavailable, return a helpful error
    return NextResponse.json({
      error: `AI provider unavailable. Configure AI_PROVIDER_URL and AI_MODEL env vars. Details: ${err.message}`
    }, { status: 503 })
  }
}