import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // ปล่อย static, _next, favicon
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("jwt")?.value;

  // ถ้าอยู่ /login แล้วไม่มี token → ปล่อยผ่าน
  if (pathname === "/login") return NextResponse.next();

  // ถ้าไม่มี token → redirect /login
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/welcome", "/patient", "/booking/:path*"],
};
