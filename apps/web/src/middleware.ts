import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }
  
  // Allow auth pages
  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }
  
  // Define protected routes  
  const protectedRoutes = ['/jobs', '/kanban', '/dashboard', '/profile', '/insights']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  
  if (isProtectedRoute) {
    // Check if user has a valid session
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    
    if (!token) {
      // User is not authenticated, redirect to login with callbackUrl
      const callbackUrl = pathname + search
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', callbackUrl)
      
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}