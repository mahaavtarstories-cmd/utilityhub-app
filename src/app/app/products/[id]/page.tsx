import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, projects(name, platform)')
    .eq('id', id)
    .single()

  if (!product) notFound()
  const p = product as any

  const fields = [
    ['Internal SKU', p.internal_sku], ['Brand', p.brand], ['Manufacturer', p.manufacturer],
    ['MPN', p.mpn], ['UPC', p.upc], ['Model', p.model], ['Product Name', p.product_name],
    ['Weight', p.weight], ['Material', p.material], ['Color', p.color],
    ['Manufacturer URL', p.manufacturer_url], ['Product URL', p.product_url],
    ['Research Status', p.research_status], ['QA Status', p.qa_status],
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/app/products" className="text-sm text-slate-400 hover:text-white">← Products</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{p.product_name || p.brand || 'Product'}</h1>
        <p className="text-sm text-slate-400">{p.projects?.name} — {p.projects?.platform}</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white">Product Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-white">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {p.description && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{p.description}</p>
        </div>
      )}

      {p.specifications && Object.keys(p.specifications).length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-2">Specifications</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(p.specifications).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-slate-400">{key}</p>
                <p className="text-white">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link href={`/app/products/${id}/edit`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Edit</Link>
        {(user.role === 'admin' || user.role === 'manager') && (
          <form action={`/app/products/${id}/create-task`} method="POST">
            <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Create Task</button>
          </form>
        )}
      </div>
    </div>
  )
}