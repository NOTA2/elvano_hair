import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/auth/kakao")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("admin_session");

  if (!sessionCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};

