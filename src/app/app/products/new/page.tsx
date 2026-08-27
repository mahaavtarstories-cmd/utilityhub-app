import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProductForm from '@/components/product-form'

export default async function NewProductPage() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager', 'researcher'].includes(user.role)) return null
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, name, platform').eq('status', 'active').order('name')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/app/products" className="text-sm text-slate-400 hover:text-white">← Products</Link>
        <h1 className="text-2xl font-bold text-white mt-2">New Product</h1>
      </div>
      <ProductForm projectId={projects?.[0]?.id || ''} />
    </div>
  )
}