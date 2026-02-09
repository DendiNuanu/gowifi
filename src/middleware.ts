import { NextResponse, NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Protect /admin route (but not /admin/login)
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        const adminLoggedIn = request.cookies.get('admin_logged_in')

        if (!adminLoggedIn) {
            // Redirect to login if not authenticated
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: '/admin/:path*',
}
