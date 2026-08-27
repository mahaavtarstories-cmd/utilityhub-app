import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS } from '@/lib/types'
import Link from 'next/link'
import ProductForm from '@/components/product-form'

export default async function ProductsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, project_id, internal_sku, brand, mpn, upc, product_name, research_status, qa_status, projects(name, platform)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        {(user.role === 'admin' || user.role === 'manager' || user.role === 'researcher') && (
          <Link href="/app/products/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + New Product
          </Link>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">MPN</th>
              <th className="px-4 py-3 font-medium">UPC</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Research</th>
              <th className="px-4 py-3 font-medium">QA</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-300">{p.internal_sku || '—'}</td>
                <td className="px-4 py-3 text-white">{p.brand || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{p.mpn || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{p.upc || '—'}</td>
                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{p.product_name || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{PLATFORM_LABELS[p.projects?.platform as keyof typeof PLATFORM_LABELS] || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${p.research_status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.research_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${p.qa_status === 'approved' ? 'bg-green-100 text-green-700' : p.qa_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.qa_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/app/products/${p.id}`} className="text-blue-400 hover:text-blue-300 text-sm">View →</Link>
                </td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No products yet. Import Excel or create manually.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}