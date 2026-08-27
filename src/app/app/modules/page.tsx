import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'
import Link from 'next/link'

interface PlatformModule {
  platform: string
  label: string
  fields: { key: string; label: string; type: string; required: boolean; placeholder?: string }[]
  qaChecks: string[]
  template: string
}

const PLATFORM_MODULES: Record<string, PlatformModule> = {
  ebay: {
    platform: 'ebay',
    label: 'eBay',
    fields: [
      { key: 'title', label: 'eBay Title', type: 'text', required: true, placeholder: 'Brand + Product + Specs - MPN (max 80 chars, no commas)' },
      { key: 'description', label: 'eBay Description', type: 'textarea', required: true, placeholder: 'H2 first line → Intro → Key Features → Additional Info → Downloads' },
      { key: 'category', label: 'eBay Category', type: 'text', required: false, placeholder: 'e.g. Fishing Reels, Tactical Holsters' },
      { key: 'item_specifics', label: 'Item Specifics', type: 'json', required: false, placeholder: 'Brand, MPN, UPC, Type — key: value pairs' },
      { key: 'condition', label: 'Condition', type: 'select', required: true, placeholder: 'New, Used, Refurbished' },
      { key: 'listing_type', label: 'Listing Type', type: 'select', required: true, placeholder: 'Fixed Price, Auction' },
      { key: 'price', label: 'Price ($)', type: 'number', required: false },
      { key: 'quantity', label: 'Quantity', type: 'number', required: false },
    ],
    qaChecks: [
      'Title: no commas, no parens, no ®/™, max 80 chars',
      'Title uses " - " before MPN, full size words',
      'Description: plain text, no HTML, real newlines',
      'Description has H2 first line, Key Features, Additional Info',
      'Brand + MPN + UPC in Additional Info',
      'Country Of Origin label (not Manufacturing)',
      'No "Made in USA" in Key Features',
    ],
    template: 'eBay Listing Template'
  },
  amazon: {
    platform: 'amazon',
    label: 'Amazon',
    fields: [
      { key: 'title', label: 'Amazon Title', type: 'text', required: true, placeholder: 'Brand + Product + Key Feature + Size/Color (max 200 chars)' },
      { key: 'bullets', label: 'Bullet Points (5)', type: 'textarea', required: true, placeholder: 'One bullet per line — benefit-first, max 500 chars each' },
      { key: 'description', label: 'Product Description', type: 'textarea', required: true, placeholder: 'HTML allowed: <p>, <br>, <b>, <ul>, <li>' },
      { key: 'category', label: 'Amazon Category', type: 'text', required: true, placeholder: 'Browse Node or category name' },
      { key: 'item_type', label: 'Item Type Keyword', type: 'text', required: true, placeholder: 'Must match Amazon accepted values' },
      { key: 'variation_theme', label: 'Variation Theme', type: 'select', required: false, placeholder: 'Size, Color, Size+Color' },
      { key: 'brand', label: 'Brand (Registry)', type: 'text', required: true, placeholder: 'Must match Brand Registry exactly' },
      { key: 'price', label: 'Price ($)', type: 'number', required: false },
    ],
    qaChecks: [
      'Title under 200 chars, no promotional language',
      '5 bullet points, each under 500 chars, benefit-first',
      'Main image white background, no text/watermarks',
      'All required category attributes filled',
      'UPC/GTIN valid and matches product',
      'Brand matches Amazon Brand Registry',
      'No restricted/banned keywords',
      'Variation parent/child structure correct',
    ],
    template: 'Amazon Listing Template'
  },
  gunbroker: {
    platform: 'gunbroker',
    label: 'GunBroker',
    fields: [
      { key: 'title', label: 'GunBroker Title', type: 'text', required: true, placeholder: 'Brand + Model + Type + Specs + Condition (max 80 chars, no commas)' },
      { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Overview → Features → Specs → Payment/Shipping → FFL requirements' },
      { key: 'category', label: 'GunBroker Category', type: 'select', required: true, placeholder: 'Handguns, Rifles, Shotguns, Ammo, Accessories, Reloading' },
      { key: 'caliber', label: 'Caliber/Gauge', type: 'text', required: false, placeholder: 'e.g. 9mm, 12 Gauge, .223 Rem' },
      { key: 'action', label: 'Action Type', type: 'select', required: false, placeholder: 'Semi-Auto, Bolt, Lever, Pump, Revolver' },
      { key: 'barrel_length', label: 'Barrel Length', type: 'text', required: false, placeholder: 'e.g. 16.5", 4.2"' },
      { key: 'capacity', label: 'Capacity', type: 'text', required: false, placeholder: 'e.g. 10+1, 30 round' },
      { key: 'finish', label: 'Finish', type: 'text', required: false, placeholder: 'e.g. Blued, Parkerized, Cerakote' },
      { key: 'condition', label: 'Condition', type: 'select', required: true, placeholder: 'New, Used, Refurbished, Demo' },
      { key: 'ffl_required', label: 'FFL Required', type: 'checkbox', required: true },
      { key: 'payment_methods', label: 'Payment Methods', type: 'textarea', required: true, placeholder: 'e.g. Credit Card, USPS Money Order, Cashier Check' },
      { key: 'shipping_info', label: 'Shipping Info', type: 'textarea', required: true, placeholder: 'Carrier, cost, restrictions' },
    ],
    qaChecks: [
      'Title under 80 chars, no commas, no ®/™',
      'Condition stated in title AND description',
      'All manufacturer specs included',
      'Payment/Shipping terms present',
      'FFL requirements noted for firearms',
      'No prohibited items (check GunBroker banned list)',
      'UPC/MPN matches product',
      'Correct category (no cross-category listings)',
      'Ammo: caliber + grain + bullet type + count',
    ],
    template: 'GunBroker Listing Template'
  },
  nightgalaxy: {
    platform: 'nightgalaxy',
    label: 'Night Galaxy',
    fields: [
      { key: 'product_type', label: 'Product Type', type: 'select', required: true, placeholder: 'simple, configurable' },
      { key: 'title', label: 'Product Title (Col N)', type: 'text', required: true, placeholder: 'Brand + Model + Description + Size/Variant - MPN-Suffix (max 120 chars)' },
      { key: 'description', label: 'Description (Col O)', type: 'textarea', required: true, placeholder: 'H2 first line → Intro → Key Features → Additional Info → Downloads' },
      { key: 'meta_title', label: 'Meta Title (Col W)', type: 'text', required: true, placeholder: 'SEO-friendly with size + MPN' },
      { key: 'meta_keywords', label: 'Meta Keywords (Col X)', type: 'text', required: true, placeholder: 'Brand + SEO terms + compatibility + material' },
      { key: 'meta_description', label: 'Meta Description (Col Y)', type: 'textarea', required: true, placeholder: 'Source-supported facts, natural language' },
      { key: 'main_image', label: 'Main Image URL (Col P)', type: 'text', required: true, placeholder: 'https://images.nightgalaxy.com/img/{Letter}/{Brand}/...' },
      { key: 'additional_images', label: 'Additional Images (Col Q)', type: 'text', required: false, placeholder: 'Comma-separated URLs' },
      { key: 'parent_sku', label: 'Parent SKU (Col H)', type: 'text', required: false, placeholder: 'Blank on parent, filled on children' },
      { key: 'var_size', label: 'Variation: Size (Col I)', type: 'text', required: false },
      { key: 'var_width', label: 'Variation: Width (Col J)', type: 'text', required: false },
      { key: 'visibility', label: 'Visibility (Col L)', type: 'select', required: true, placeholder: 'Catalog,Search (parent) / Search (child)' },
      { key: 'weight', label: 'Weight (Col T)', type: 'text', required: false },
      { key: 'color', label: 'Color (Col U)', type: 'text', required: false },
      { key: 'gender', label: 'Gender (Col V)', type: 'select', required: false, placeholder: "Men's, Women's, Youth, Unisex" },
    ],
    qaChecks: [
      'Description plain text, no HTML, H2 = first line',
      'Title MPN uses hyphen (533-095W), Col G uses space (533 095W)',
      'Country Of Origin standalone, not "Manufacturing:"',
      'Each compliance = separate line (Made in USA, Berry Compliant = 2 lines)',
      'No MSRP in customer-facing content',
      'No ®/™ symbols',
      'Images from brand TXT list, correct paths',
      'PDFs English, Night Galaxy paths, no duplicates',
      'Parent: Catalog,Search visibility. Children: Search only',
      'Configurable selector only when 2+ distinct values',
      'Variable optics: Min/Max. Fixed: Magnification',
      'Meta Title + Keywords + Description all filled',
    ],
    template: 'Night Galaxy Magento Template'
  }
}

export default async function PlatformModulesPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, name, platform, status').order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Modules</h1>
        <p className="text-sm text-slate-400 mt-1">Platform-specific fields, validation, templates, and QA checklists per marketplace</p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(PLATFORM_MODULES).map(mod => {
          const project = projects?.find((p: any) => p.platform === mod.platform)
          return (
            <div key={mod.platform} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[mod.platform as keyof typeof PLATFORM_COLORS]}`}>
                  {mod.label}
                </span>
                {project && (
                  <Link href={`/app/projects/${project.id}`}
                    className="text-xs text-slate-400 hover:text-white">{project.name} →</Link>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{mod.template}</h3>
              <p className="text-sm text-slate-400 mb-3">{mod.fields.length} platform-specific fields</p>

              {/* Field list */}
              <div className="space-y-1 mb-3">
                <p className="text-xs text-slate-400 font-medium">Fields:</p>
                <div className="flex flex-wrap gap-1">
                  {mod.fields.slice(0, 6).map(f => (
                    <span key={f.key} className={`text-xs px-2 py-0.5 rounded ${f.required ? 'bg-blue-950/50 text-blue-300 border border-blue-800' : 'bg-slate-700 text-slate-300'}`}>
                      {f.label}{f.required ? ' *' : ''}
                    </span>
                  ))}
                  {mod.fields.length > 6 && (
                    <span className="text-xs text-slate-500">+{mod.fields.length - 6} more</span>
                  )}
                </div>
              </div>

              {/* QA checklist count */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-400">{mod.qaChecks.length} QA checks</span>
                <Link href={`/app/modules/${mod.platform}`}
                  className="text-sm text-blue-400 hover:text-blue-300">Configure →</Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-sm text-slate-400">
        <p className="font-semibold text-slate-300 mb-2">Platform Modules</p>
        <p>Each module defines platform-specific fields, validation rules, QA checklists, and export templates. Modules are modular — adding a new platform doesn't require rebuilding the whole system.</p>
        <p className="mt-2">Fields marked with * are required for that platform. QA checks run automatically when a task is submitted for review.</p>
      </div>
    </div>
  )
}