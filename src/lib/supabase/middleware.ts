import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

  // Single getUser call
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/app/login'

  // Only protect /app routes that are NOT the login page
  if (pathname.startsWith('/app') && !isLoginPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Only redirect away from login if user is ACTUALLY logged in
  // Add a small check to prevent redirect loops
  if (isLoginPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}