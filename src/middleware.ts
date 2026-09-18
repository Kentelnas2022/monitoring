import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected application routes that require an authenticated session
const PROTECTED_ROUTES = [
  '/dashboard',
  '/monitoring',
  '/receiver',
  '/activity',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('monitoring_auth_session')?.value;
  const isAuthenticated = sessionCookie === 'true';

  // Check if requested route is one of the protected paths
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected) {
    // 1. If not authenticated, block access and redirect to login (root page)
    if (!isAuthenticated) {
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 2. If authenticated, rewrite the route to root so Next.js renders the dashboard client seamlessly
    return NextResponse.rewrite(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/monitoring',
    '/monitoring/:path*',
    '/receiver',
    '/receiver/:path*',
    '/activity',
    '/activity/:path*',
    '/settings',
    '/settings/:path*',
  ],
};
