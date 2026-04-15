import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

const protectedPaths = ['/profile', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  if (!isProtected) return NextResponse.next();

  // Check for auth token in cookies or Authorization header
  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    // No cookie yet — could be a hydration race (Zustand sets cookie client-side).
    // Let the page load; client-side auth check will redirect if truly not logged in.
    return NextResponse.next();
  }

  // Validate that the JWT hasn't expired
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    if (decoded.exp * 1000 < Date.now()) {
      // Token expired — clear the stale cookie and redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('access_token');
      return response;
    }
  } catch {
    // Malformed token — clear and redirect
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/admin/:path*'],
};
