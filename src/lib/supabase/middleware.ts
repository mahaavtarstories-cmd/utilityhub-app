import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths that should NOT trigger auth check
const PUBLIC_PATHS = ['/app/login']

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip entirely for public paths — no Supabase client, no cookie refresh
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next({ request })
  }

  // Only run auth for /app/* routes
  if (!pathname.startsWith('/app')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // No user → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}