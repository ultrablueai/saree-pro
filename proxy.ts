import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sareepro_session";
const LEGACY_SESSION_COOKIE = "sareepro-session";
const authOnlyPaths = ["/login", "/register"];
const protectedPaths = ["/workspace"];

function isAuthenticated(request: NextRequest) {
  return Boolean(
    request.cookies.get(SESSION_COOKIE)?.value ??
      request.cookies.get(LEGACY_SESSION_COOKIE)?.value,
  );
}

function isPathMatch(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = isAuthenticated(request);

  if (hasSession && isPathMatch(pathname, authOnlyPaths)) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (!hasSession && isPathMatch(pathname, protectedPaths)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/workspace/:path*"],
};
