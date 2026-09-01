// Shared AI + web search helpers for UtilityHub batch processing.
// Provider: ollama.com cloud (generate + web_search) — same API key, Bearer auth.

export const AI_URL = process.env.AI_PROVIDER_URL || 'http://localhost:11434/api/generate'
export const AI_MODEL = process.env.AI_MODEL || 'qwen3.5:cloud'
export const AI_KEY = process.env.AI_API_KEY

// Derived from AI_PROVIDER_URL (e.g. https://ollama.com/api/generate -> https://ollama.com)
export const AI_BASE = (() => {
  try {
    const u = new URL(AI_URL)
    return `${u.protocol}//${u.host}`
  } catch {
    return 'http://localhost:11434'
  }
})()

export function aiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (AI_KEY) {
    h['Authorization'] = `Bearer ${AI_KEY}`
    h['X-API-Key'] = AI_KEY
  }
  return h
}

// Generate — think:false is REQUIRED for qwen3.5 (default thinking empties `response`)
export async function callAI(prompt: string, opts?: { numPredict?: number }): Promise<string> {
  const res = await fetch(`${AI_BASE}/api/generate`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'qwen3.5:cloud',
      prompt,
      stream: false,
      think: false,
      ...(opts?.numPredict ? { options: { num_predict: opts.numPredict } } : {}),
    }),
    signal: AbortSignal.timeout(55000),
  })
  if (!res.ok) throw new Error(`AI provider error: ${res.status}`)
  const data = await res.json()
  return data.response || ''
}

// Web search via ollama.com — same key as generation
export interface SearchResult {
  url: string
  title: string
  content: string
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const res = await fetch(`${AI_BASE}/api/web_search`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({ query, max_results: maxResults }),
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).map((r: any) => ({ url: r.url, title: r.title || '', content: r.content || '' }))
}

// Fetch a page and return cleaned text + key metadata
export async function fetchPageText(
  url: string,
  maxChars = 4000
): Promise<{ title: string; h1: string; metaDesc: string; text: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || ''
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() || ''
    const metaDesc =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || ''
    const text = htmlToText(html).slice(0, maxChars)
    return { title, h1, metaDesc: metaDesc || '', text }
  } catch {
    return null
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

// Same-product check: does a fetched page clearly refer to the same product?
export function sameProductCheck(
  pageText: string,
  mpn: string | null,
  upc: string | null,
  productHint: string
): { match: boolean; how: string } {
  const text = pageText.toLowerCase()

  if (mpn && text.includes(mpn.toLowerCase())) return { match: true, how: 'mpn_found_on_page' }

  if (mpn) {
    // compact MPN (strip spaces/dashes) — sites format MPNs differently
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const compact = norm(mpn)
    if (compact.length >= 5 && norm(pageText).includes(compact)) return { match: true, how: 'mpn_normalized' }
  }

  if (upc && pageText.includes(upc)) return { match: true, how: 'upc_found' }

  // fallback: significant overlap between product name tokens and page text tokens
  const tokens = productHint.toLowerCase().split(/\s+/).filter((t) => t.length > 3)
  if (tokens.length >= 2 && tokens.filter((t) => text.includes(t)).length / tokens.length >= 0.6) {
    return { match: true, how: 'title_tokens' }
  }

  return { match: false, how: '' }
}

// Domain classification
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}