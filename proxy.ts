import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'sareepro_session';
const LEGACY_SESSION_COOKIE = 'sareepro-session';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;

const strictRoutes = {
  '/api/auth': { window: 5 * 60 * 1000, max: 20 },
  '/login': { window: 5 * 60 * 1000, max: 15 },
};

function getRateLimitConfig(pathname: string) {
  for (const [route, config] of Object.entries(strictRoutes)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }

  return { window: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX_REQUESTS };
}

function checkRateLimit(ip: string, config: { window: number; max: number }) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + config.window });
    return { allowed: true, remaining: config.max - 1 };
  }

  record.count += 1;

  if (record.count > config.max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  return { allowed: true, remaining: config.max - record.count };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 10 * 60 * 1000);

function isAuthenticated(request: NextRequest) {
  return Boolean(
    request.cookies.get(SESSION_COOKIE)?.value ??
      request.cookies.get(LEGACY_SESSION_COOKIE)?.value,
  );
}

function isPathMatch(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const publicRoutes = [
  '/login',
  '/forgot-password',
  '/register',
];

const alwaysPublicRoutes = [
  '/',
  '/manifest.ts',
  '/favicon.ico',
  '/api/health',
  '/api/hello',
];

const staticExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.ico', '.woff', '.woff2'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  if (pathname.startsWith('/api')) {
    const config = getRateLimitConfig(pathname);
    const rateLimit = checkRateLimit(ip, config);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(config.max),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  if (staticExtensions.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  if (alwaysPublicRoutes.includes(pathname)) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  const hasSession = isAuthenticated(request);

  if (hasSession && isPathMatch(pathname, publicRoutes)) {
    return NextResponse.redirect(new URL('/workspace', request.url));
  }

  if (!hasSession && isPathMatch(pathname, ['/workspace'])) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasSession && !publicRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession) {
    const sessionCookie =
      request.cookies.get(SESSION_COOKIE)?.value ||
      request.cookies.get(LEGACY_SESSION_COOKIE)?.value;

    try {
      const session = JSON.parse(sessionCookie!);

      if (!session || !session.id || !session.role) {
        throw new Error('Invalid session');
      }

      const response = NextResponse.next();
      response.headers.set('x-user-id', session.id);
      response.headers.set('x-user-role', session.role);
      response.headers.set('x-user-email', session.email);

      if (pathname.startsWith('/owner-access') && !session.ownerAccess) {
        return NextResponse.redirect(new URL('/workspace', request.url));
      }

      addSecurityHeaders(response);
      return response;
    } catch {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.cloudinary.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  response.headers.delete('x-powered-by');
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
