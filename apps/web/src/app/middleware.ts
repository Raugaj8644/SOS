import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/areas/join'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Check for access token in cookies (set by auth service)
  const hasToken =
    req.cookies.has('cerp_refresh') || // HttpOnly refresh cookie
    req.headers.get('authorization')?.startsWith('Bearer ');

  if (!isPublic && !hasToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isPublic && hasToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.json).*)'],
};
