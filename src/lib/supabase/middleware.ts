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

  // Refresh session if exists
  await supabase.auth.getUser()

  // Get user once
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/app/login'
  const isProtected = pathname.startsWith('/app') && !isLoginPage

  // Protect /app routes — redirect to login if no user
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login page
  if (isLoginPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}