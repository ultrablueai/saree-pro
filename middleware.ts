import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// المسارات العامة التي لا تحتاج مصادقة
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/health',
  '/api/hello',
  '/offline.html',
  '/sw.js',
];

// المسارات التي تحتاج مصادقة
const protectedPaths = ['/workspace', '/owner-access'];

// المسارات التي يجب أن يكون المستخدم غير مسجل دخول للوصول إليها
const authOnlyPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // التحقق من وجود session cookie
  const sessionCookie = request.cookies.get('sareepro-session');
  const isAuthenticated = !!sessionCookie;

  // إذا كان المسار عاماً، اسمح بالوصول
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // إذا كان المستخدم مسجل دخوله وحاول الوصول لصفحات المصادقة
    if (authOnlyPaths.some(path => pathname.startsWith(path)) && isAuthenticated) {
      return NextResponse.redirect(new URL('/workspace', request.url));
    }
    return NextResponse.next();
  }

  // إذا كان المسار محمياً والمستخدم غير مسجل
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // أي مسار آخر - تحقق من المصادقة
  if (!isAuthenticated && !pathname.startsWith('/_next') && !pathname.startsWith('/api/')) {
    // استثناء الملفات الثابتة والـ API
    if (!pathname.includes('.') && !pathname.startsWith('/icons')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, offline.html, sw.js)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
