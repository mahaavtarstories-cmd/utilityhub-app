import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { webSearch, fetchPageText, sameProductCheck, domainOf } from '@/lib/ai'

// Night Galaxy pipeline — STEP 2: URL discovery for ONE product.
// Finds: brand site URL (fallback: supplier), competitor URL, other URL.
// Verifies all sources sell the SAME product (MPN/UPC/title-token match).
// Results -> products.manufacturer_url, product_url, source_info (incl. page_data for generation).

export const maxDuration = 60

interface FoundEntry {
  url: string
  verified: boolean
  how: string
  title: string
}

// "Belleville Boot" -> "bellevilleboot" (for domain token matching)
function brandToken(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]/g, '')
}

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

  const brand = product.brand || ''
  const mpn = product.mpn || ''
  const upc = product.upc || ''
  const productName = product.product_name || ''
  if (!brand && !mpn && !upc) {
    await supabase.from('products').update({ research_status: 'url_search_failed' }).eq('id', productId)
    return NextResponse.json({ error: 'Product has no Brand/MPN/UPC — cannot discover URLs' }, { status: 400 })
  }

  // Approved sources for this project
  const { data: sources } = await supabase.from('approved_sources').select('*').eq('project_id', product.project_id)
  const brandDomains: string[] = (sources || [])
    .map((s: any) => domainOf(s.url))
    .filter(Boolean)

  const spec: any = product.specifications || {}
  const hint = [productName, spec.product_type, brand].filter(Boolean).join(' ')

  const found: Record<'brand' | 'supplier' | 'competitor' | 'other', FoundEntry | null> = {
    brand: null, supplier: null, competitor: null, other: null,
  }
  const pageData: Record<string, { title: string; h1: string; meta_desc: string; text: string }> = {}
  const usedDomains = new Set<string>()

  // ---- 0. Pre-seeded brand URL from Excel/import — verify it first
  if (product.manufacturer_url) {
    const seedUrl = product.manufacturer_url
    const page = await fetchPageText(seedUrl, 3500)
    const check = page ? sameProductCheck(page.text + ' ' + page.title, mpn, upc, hint) : { match: false, how: 'fetch_failed' }
    found.brand = { url: seedUrl, verified: check.match, how: check.how || 'seeded_unverified', title: page?.title || '' }
    if (page && check.match) {
      pageData.brand = { title: page.title, h1: page.h1, meta_desc: page.metaDesc, text: page.text }
    }
    usedDomains.add(domainOf(seedUrl))
  }

  // ---- 1. Brand site search (primary)
  if (!found.brand || !found.brand.verified) {
    const query = mpn
      ? (brandDomains.length ? `${mpn} site:${brandDomains.join(' OR site:')}` : `${mpn} ${brand} official product page`)
      : `${brand} ${productName} official site`
    const results = await webSearch(query, 6)
    for (const r of results) {
      const d = domainOf(r.url)
      if (!d || usedDomains.has(d)) continue
      const isBrandDomain = brandDomains.length > 0 && brandDomains.some((bd) => d === bd || d.endsWith(`.${bd}`) || bd.endsWith(d))
      const isBrandToken = brand && d.includes(brandToken(brand))
      if (!isBrandDomain && !isBrandToken) continue
      const page = await fetchPageText(r.url, 4000)
      if (!page) continue
      const check = sameProductCheck(page.text + ' ' + page.title, mpn, upc, hint || productName)
      if (check.match || isBrandDomain) {
        found.brand = { url: r.url, verified: check.match, how: check.how || 'brand_domain_match', title: page.title || r.title }
        pageData.brand = { title: page.title, h1: page.h1, meta_desc: page.metaDesc, text: page.text }
        usedDomains.add(d)
        break
      }
    }
    if (found.brand) usedDomains.add(domainOf(found.brand.url))
  }

  // ---- 2. Supplier fallback (only if brand missing/unverified)
  if (!found.brand || !found.brand.verified) {
    // 2a. supplier URL provided in Excel (product_url)
    if (product.product_url && domainOf(product.product_url) !== domainOf(product.manufacturer_url || '')) {
      const page = await fetchPageText(product.product_url, 4000)
      if (page) {
        const check = sameProductCheck(page.text + ' ' + page.title, mpn, upc, hint)
        found.supplier = { url: product.product_url, verified: check.match, how: check.how || 'supplier_unverified', title: page.title }
        if (check.match) {
          pageData.supplier = { title: page.title, h1: page.h1, meta_desc: page.metaDesc, text: page.text }
          usedDomains.add(domainOf(product.product_url))
        }
      }
    }
    // 2b. search for supplier page
    if (!found.supplier) {
      const q = mpn ? `${mpn} ${brand} buy` : `${brand} ${productName}`
      const results = await webSearch(q, 6)
      const pick = results.find((r) => {
        const d = domainOf(r.url)
        return d && !usedDomains.has(d) && !/\.(pdf)$/i.test(r.url)
      })
      if (pick) {
        const page = await fetchPageText(pick.url, 4000)
        const check = page ? sameProductCheck(page.text + ' ' + page.title, mpn, upc, hint) : { match: false, how: 'fetch_failed' }
        found.supplier = { url: pick.url, verified: check.match, how: check.how || 'unverified', title: page?.title || pick.title }
        if (page && check.match) {
          pageData.supplier = { title: page.title, h1: page.h1, meta_desc: page.metaDesc, text: page.text }
          usedDomains.add(domainOf(pick.url))
        }
      }
    }
    if (found.supplier) usedDomains.add(domainOf(found.supplier.url))
  }

  // ---- 3. Competitor URL — retailer selling same product, different domain
  {
    const q = mpn ? `${mpn} ${brand} buy` : `${brand} ${productName} buy`
    const results = await webSearch(q, 6)
    const retailerHints = ['opticsplanet', 'amazon', 'ebay', 'walmart', 'tacticalgear', 'sportsmans', 'palmetto', 'brownells', 'midwayusa', 'cabela', 'basspro', 'academy', 'dicksgoods', 'militarybootsdirect', 'botach']
    const pick = results.find((r) => {
      const d = domainOf(r.url)
      if (!d || usedDomains.has(d) || /\.(pdf|jpg|png)$/i.test(r.url)) return false
      return retailerHints.some((h) => d.includes(h)) || !d.includes(brandToken(brand))
    })
    if (pick) {
      const page = await fetchPageText(pick.url, 3000)
      const check = page ? sameProductCheck(page.text + ' ' + page.title, mpn, upc, hint) : { match: false, how: 'fetch_failed' }
      found.competitor = { url: pick.url, verified: check.match, how: check.how || 'unverified', title: page?.title || pick.title }
      if (page && check.match) {
        pageData.competitor = { title: page.title, h1: page.h1, meta_desc: page.metaDesc, text: page.text }
        usedDomains.add(domainOf(pick.url))
      }
    }
  }

  // ---- 4. Other URL — one more independent source
  {
    const q = mpn ? `"${mpn}" ${brand}` : `${brand} ${productName}`
    const results = await webSearch(q, 8)
    const pick = results.find((r) => !usedDomains.has(domainOf(r.url)) && !/\.(pdf)$/i.test(r.url))
    if (pick) {
      const page = await fetchPageText(pick.url, 3000)
      const check = page ? sameProductCheck(page.text + ' ' + page.title, mpn, upc, hint) : { match: false, how: 'fetch_failed' }
      found.other = { url: pick.url, verified: check.match, how: check.how || 'unverified', title: page?.title || pick.title }
      if (page && check.match) {
        pageData.other = { title: page.title, h1: page.h1, meta_desc: page.metaDesc, text: page.text }
        usedDomains.add(domainOf(pick.url))
      }
    }
  }

  // ---- Save results
  const verifiedCount = Object.values(found).filter((f) => f?.verified).length
  const foundCount = Object.values(found).filter((f) => f?.url).length
  const confirmed = verifiedCount >= 2
  const primary = found.brand?.verified ? found.brand.url : found.supplier?.verified ? found.supplier.url : found.brand?.url || found.supplier?.url || ''

  const sourceInfo: any = typeof product.source_info === 'object' && product.source_info ? { ...product.source_info } : {}
  sourceInfo.urls = found
  sourceInfo.verified_count = verifiedCount
  sourceInfo.confirmation = verifiedCount >= 2 ? 'same_product_confirmed' : foundCount === 1 ? 'single_source_only' : 'no_sources_found'
  sourceInfo.page_data = pageData
  sourceInfo.discovered_at = new Date().toISOString()

  const update: any = { source_info: sourceInfo, research_status: foundCount > 0 ? 'urls_found' : 'url_search_failed' }
  if (found.brand?.url) update.manufacturer_url = found.brand.url
  if (primary) update.product_url = primary

  const { error } = await supabase.from('products').update(update).eq('id', productId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    productId,
    urls: found,
    confirmation: sourceInfo.confirmation,
    verifiedCount,
    status: update.research_status,
  })
}