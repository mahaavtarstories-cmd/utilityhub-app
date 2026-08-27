import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('*, projects(name, platform), products(brand, mpn, upc, product_name, description, manufacturer_url, product_url)')
    .eq('id', id)
    .single()

  if (!task) notFound()
  const t = task as any

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/app/tasks" className="text-sm text-slate-400 hover:text-white">← Tasks</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{t.title}</h1>
        {t.description && <p className="text-slate-400 mt-1">{t.description}</p>}
      </div>

      {/* Product info */}
      {t.products && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Product</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label="Brand" value={t.products.brand} />
            <Field label="MPN" value={t.products.mpn} />
            <Field label="UPC" value={t.products.upc} />
            <Field label="Product" value={t.products.product_name} />
            <Field label="Manufacturer URL" value={t.products.manufacturer_url} link />
            <Field label="Product URL" value={t.products.product_url} link />
          </div>
          {t.products.description && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.products.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Status: <span className="text-blue-400 capitalize">{t.status.replace('_', ' ')}</span></h2>
        {(user.role === 'researcher' && (t.status === 'assigned' || t.status === 'rejected' || t.status === 'in_progress')) && (
          <form action={`/app/tasks/${id}/submit`} method="POST">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Submit for QA</button>
          </form>
        )}
        {(user.role === 'qa' && t.status === 'qa_pending') && (
          <div className="flex gap-2">
            <form action={`/app/tasks/${id}/approve`} method="POST">
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Approve</button>
            </form>
            <form action={`/app/tasks/${id}/reject`} method="POST" className="flex gap-2">
              <input type="text" name="comment" placeholder="Rejection reason…" required
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">Reject</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      {link ? (
        <a href={value} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 text-sm break-all">{value}</a>
      ) : (
        <p className="text-sm text-white">{value}</p>
      )}
    </div>
  )
}