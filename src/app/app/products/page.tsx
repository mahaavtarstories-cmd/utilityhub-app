import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { PLATFORM_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function ProductsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, project_id, brand, mpn, upc, product_name, research_status, qa_status, projects(name, platform)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Products</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">MPN</th>
              <th className="px-4 py-3 font-medium">UPC</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Research</th>
              <th className="px-4 py-3 font-medium">QA</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{p.brand || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{p.mpn || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{p.upc || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{p.product_name || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{PLATFORM_LABELS[p.projects?.platform as keyof typeof PLATFORM_LABELS] || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{p.research_status}</td>
                <td className="px-4 py-3 text-slate-300">{p.qa_status}</td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No products yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}