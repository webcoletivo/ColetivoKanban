import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Add security headers
  const headers = new Headers(request.headers)
  const response = NextResponse.next({
    request: {
      headers: headers,
    },
  })

  // Security Headers
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data: https://i.ytimg.com https://img.youtube.com https://*.amazonaws.com; connect-src 'self' https://*.amazonaws.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com; media-src 'self' https://*.amazonaws.com;"
    
    response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
