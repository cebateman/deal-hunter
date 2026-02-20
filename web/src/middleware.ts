import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // The scrape API uses a shared secret, not user auth
  if (pathname.startsWith("/api/scrape")) {
    return NextResponse.next();
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const session = await getSessionFromCookieHeader(cookieHeader);

  if (!session) {
    // API routes get 401, pages get redirected
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
