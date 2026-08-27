import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/types'

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as Profile | null
}

export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.is_active) throw new Error('Account disabled')
  return user
}

export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) throw new Error('Forbidden')
  return user
}