import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/types'

const MODULE_DATA: Record<string, any> = {
  ebay: {
    fields: [
      { key: 'title', label: 'eBay Title', required: true, type: 'text', validation: 'max:80,no_commas,no_parens,no_trademarks', placeholder: 'Brand + Product + Specs - MPN' },
      { key: 'description', label: 'eBay Description', required: true, type: 'textarea', validation: 'no_html,real_newlines,has_h2,has_key_features,has_additional_info', placeholder: 'Plain text with H2, Intro, Key Features, Additional Info' },
      { key: 'category', label: 'eBay Category', required: false, type: 'text' },
      { key: 'item_specifics', label: 'Item Specifics', required: false, type: 'json' },
      { key: 'condition', label: 'Condition', required: true, type: 'select', options: ['New', 'Used', 'Refurbished', 'For Parts'] },
      { key: 'listing_type', label: 'Listing Type', required: true, type: 'select', options: ['Fixed Price', 'Auction', 'Buy It Now'] },
      { key: 'price', label: 'Price ($)', required: false, type: 'number' },
      { key: 'quantity', label: 'Quantity', required: false, type: 'number' },
    ],
    qaChecks: [
      'Title: no commas, no parens, no ®/™, max 80 chars',
      'Title uses " - " before MPN, full size words',
      'Description: plain text, no HTML, real newlines',
      'Description has H2 first line, Key Features, Additional Info',
      'Brand + MPN + UPC in Additional Info',
      'Country Of Origin label (not Manufacturing)',
      'No "Made in USA" in Key Features',
      'No ®/™ symbols anywhere',
      'PDF URLs use -Specification.pdf suffix',
    ],
    validationRules: {
      title_max_length: 80,
      title_no_commas: true,
      title_no_parentheses: true,
      title_no_trademarks: true,
      title_mpn_separator: ' - ',
      description_no_html: true,
      description_real_newlines: true,
      description_required_sections: ['H2', 'Key Features', 'Additional Info'],
      description_mandatory_fields: ['Brand', 'MPN', 'UPC', 'Country Of Origin'],
    },
  },
  amazon: {
    fields: [
      { key: 'title', label: 'Amazon Title', required: true, type: 'text', validation: 'max:200,no_promotional,no_subjective', placeholder: 'Brand + Product + Key Feature + Size/Color' },
      { key: 'bullets', label: 'Bullet Points (5)', required: true, type: 'textarea', validation: 'max_5_bullets,max_500_each,benefit_first', placeholder: 'One per line, benefit-first format' },
      { key: 'description', label: 'Product Description', required: true, type: 'textarea', validation: 'html_allowed', placeholder: 'HTML: <p>, <br>, <b>, <ul>, <li>' },
      { key: 'category', label: 'Amazon Category', required: true, type: 'text' },
      { key: 'item_type', label: 'Item Type Keyword', required: true, type: 'text' },
      { key: 'variation_theme', label: 'Variation Theme', required: false, type: 'select', options: ['Size', 'Color', 'Size+Color', 'Scent', 'Style'] },
      { key: 'brand', label: 'Brand (Registry)', required: true, type: 'text' },
      { key: 'price', label: 'Price ($)', required: false, type: 'number' },
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
      'No duplicate listings (same ASIN/UPC)',
    ],
    validationRules: {
      title_max_length: 200,
      title_no_promotional: true,
      bullets_count: 5,
      bullets_max_each: 500,
      image_main_background: 'white',
      image_main_no_text: true,
    },
  },
  gunbroker: {
    fields: [
      { key: 'title', label: 'GunBroker Title', required: true, type: 'text', validation: 'max:80,no_commas,no_trademarks,include_condition', placeholder: 'Brand + Model + Type + Specs + Condition' },
      { key: 'description', label: 'Description', required: true, type: 'textarea', validation: 'has_payment_shipping,ffl_if_firearm', placeholder: 'Overview → Features → Specs → Payment/Shipping → FFL' },
      { key: 'category', label: 'Category', required: true, type: 'select', options: ['Handguns', 'Rifles', 'Shotguns', 'Ammunition', 'Accessories', 'Reloading', 'Optics', 'Knives'] },
      { key: 'caliber', label: 'Caliber/Gauge', required: false, type: 'text' },
      { key: 'action', label: 'Action Type', required: false, type: 'select', options: ['Semi-Auto', 'Bolt Action', 'Lever Action', 'Pump Action', 'Revolver', 'Single Shot', 'Break Action'] },
      { key: 'barrel_length', label: 'Barrel Length', required: false, type: 'text' },
      { key: 'capacity', label: 'Capacity', required: false, type: 'text' },
      { key: 'finish', label: 'Finish', required: false, type: 'text' },
      { key: 'condition', label: 'Condition', required: true, type: 'select', options: ['New', 'Used', 'Refurbished', 'Demo'] },
      { key: 'ffl_required', label: 'FFL Required', required: true, type: 'checkbox' },
      { key: 'payment_methods', label: 'Payment Methods', required: true, type: 'textarea' },
      { key: 'shipping_info', label: 'Shipping Info', required: true, type: 'textarea' },
    ],
    qaChecks: [
      'Title under 80 chars, no commas, no ®/™',
      'Condition stated in title AND description',
      'All manufacturer specs included',
      'Payment/Shipping terms present',
      'FFL requirements noted for firearms',
      'No prohibited items (check GunBroker banned list)',
      'UPC/MPN matches product',
      'Correct category (no cross-category)',
      'Ammo: caliber + grain + bullet type + count',
    ],
    validationRules: {
      title_max_length: 80,
      title_no_commas: true,
      condition_in_title: true,
      payment_shipping_required: true,
      ffl_check_for_firearms: true,
      category_match: true,
    },
  },
  nightgalaxy: {
    fields: [
      { key: 'product_type', label: 'Product Type', required: true, type: 'select', options: ['simple', 'configurable'] },
      { key: 'title', label: 'Product Title (Col N)', required: true, type: 'text', validation: 'max:120,no_commas,no_parens,no_trademarks,mpn_hyphen', placeholder: 'Brand + Model + Description + Size/Variant - MPN' },
      { key: 'description', label: 'Description (Col O)', required: true, type: 'textarea', validation: 'no_html,real_newlines,has_h2,has_key_features,has_additional_info,country_of_origin', placeholder: 'H2 → Intro → Key Features → Additional Info → Downloads' },
      { key: 'meta_title', label: 'Meta Title (Col W)', required: true, type: 'text' },
      { key: 'meta_keywords', label: 'Meta Keywords (Col X)', required: true, type: 'text' },
      { key: 'meta_description', label: 'Meta Description (Col Y)', required: true, type: 'textarea' },
      { key: 'main_image', label: 'Main Image (Col P)', required: true, type: 'text', validation: 'nightgalaxy_image_path' },
      { key: 'additional_images', label: 'Additional Images (Col Q)', required: false, type: 'text' },
      { key: 'parent_sku', label: 'Parent SKU (Col H)', required: false, type: 'text' },
      { key: 'var_size', label: 'Variation: Size (Col I)', required: false, type: 'text' },
      { key: 'var_width', label: 'Variation: Width (Col J)', required: false, type: 'text' },
      { key: 'visibility', label: 'Visibility (Col L)', required: true, type: 'select', options: ['Catalog,Search', 'Search'] },
      { key: 'weight', label: 'Weight (Col T)', required: false, type: 'text' },
      { key: 'color', label: 'Color (Col U)', required: false, type: 'text' },
      { key: 'gender', label: 'Gender (Col V)', required: false, type: 'select', options: ["Men's", "Women's", 'Youth', 'Unisex', "Boys'", "Girls'"] },
    ],
    qaChecks: [
      'Description plain text, no HTML, H2 = first line',
      'Title MPN hyphen (533-095W), Col G space (533 095W)',
      'Country Of Origin standalone, not "Manufacturing:"',
      'Each compliance = separate line',
      'No MSRP in customer-facing content',
      'No ®/™ symbols',
      'Images from brand TXT, correct paths',
      'PDFs English, Night Galaxy paths, no duplicates',
      'Parent: Catalog,Search. Children: Search only',
      'Configurable selector only when 2+ distinct values',
      'Variable optics: Min/Max. Fixed: Magnification',
      'Meta Title + Keywords + Description all filled',
    ],
    validationRules: {
      title_max_length: 120,
      title_no_commas: true,
      title_mpn_hyphen: true,
      description_no_html: true,
      description_required_sections: ['H2', 'Key Features', 'Additional Info'],
      description_mandatory_fields: ['Brand', 'MPN', 'UPC', 'Country Of Origin'],
      image_path_format: 'https://images.nightgalaxy.com/img/{Letter}/{Brand}/{File}',
      pdf_path_format: 'https://images.nightgalaxy.com/PDF/{Letter}/{Brand}/{File}',
      visibility_parent: 'Catalog,Search',
      visibility_child: 'Search',
      configurable_min_values: 2,
    },
  },
}

export default async function PlatformModulePage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) return null

  const mod = MODULE_DATA[platform]
  if (!mod) notFound()

  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('id, name').eq('platform', platform).single()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/app/modules" className="text-sm text-slate-400 hover:text-white">← Platform Modules</Link>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs px-2 py-1 rounded border ${PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS]}`}>
            {PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS]}
          </span>
          <h1 className="text-2xl font-bold text-white">{PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS]} Module</h1>
        </div>
        {project && <p className="text-sm text-slate-400 mt-1">Project: <Link href={`/app/projects/${project.id}`} className="text-blue-400 hover:text-blue-300">{project.name}</Link></p>}
      </div>

      {/* Fields */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Platform Fields ({mod.fields.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr className="text-left text-slate-400">
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium">Validation</th>
              </tr>
            </thead>
            <tbody>
              {mod.fields.map((f: any) => (
                <tr key={f.key} className="border-t border-slate-700">
                  <td className="px-3 py-2 text-white">{f.label}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono text-xs">{f.key}</td>
                  <td className="px-3 py-2 text-slate-300">{f.type}{f.options ? ` (${f.options.length} options)` : ''}</td>
                  <td className="px-3 py-2">{f.required ? <span className="text-red-400">Yes</span> : <span className="text-slate-500">No</span>}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs font-mono">{f.validation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Rules */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Validation Rules</h2>
        <pre className="text-sm text-green-300 bg-slate-900/50 p-4 rounded-lg overflow-x-auto">{JSON.stringify(mod.validationRules, null, 2)}</pre>
      </div>

      {/* QA Checklist */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">QA Checklist ({mod.qaChecks.length})</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          {mod.qaChecks.map((check: string, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 flex-wrap">
        {project && (
          <>
            <Link href={`/app/projects/${project.id}/rulebook`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">Rulebook</Link>
            <Link href={`/app/projects/${project.id}/sources`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">Approved Sources</Link>
            <Link href={`/app/projects/${project.id}/import`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Import Excel</Link>
            <Link href={`/app/projects/${project.id}/export`} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Export</Link>
          </>
        )}
      </div>
    </div>
  )
}