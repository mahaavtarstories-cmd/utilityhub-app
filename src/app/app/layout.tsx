import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/app/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/app/login')

  const p = profile as Profile

  if (!p.is_active) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Account Disabled</h1>
          <p className="text-slate-400">Contact your administrator.</p>
          <form action="/app/login?action=logout" method="POST" className="mt-4">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sign Out</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={p.role} userEmail={p.email} userName={p.full_name} />
      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}