import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('jwt')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
  const storedRole = request.cookies.get('userRole')?.value;

  console.log('Middleware: Checking session - Token exists:', !!token, 'Stored role:', storedRole, 'Path:', request.nextUrl.pathname);

  if (token && storedRole === 'admin' && request.nextUrl.pathname === '/login') {
    console.log('Middleware: Valid admin session, redirecting to dashboard');
    return NextResponse.redirect(new URL('/admin/dashboard?tab=vaccines', request.url));
  }

  if (token && storedRole === 'patient' && request.nextUrl.pathname === '/login') {
    console.log('Middleware: Valid patient session, redirecting to welcome');
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  if (!token && request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    console.log('Middleware: No valid session, redirecting to login');
    return NextResponse.redirect(new URL('/login?error=SessionExpired', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/admin/dashboard/:path*', '/welcome'],
};